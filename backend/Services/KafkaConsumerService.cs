using Confluent.Kafka;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using System.Text.Json;

public class KafkaConsumerService : BackgroundService
{
    private IConsumer<string, string>? _consumer;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<KafkaConsumerService> _logger;
    private readonly KafkaConfig _config;

    public KafkaConsumerService(
        IOptions<KafkaConfig> config,
        IServiceProvider serviceProvider,
        ILogger<KafkaConsumerService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _config = config.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Yield immediately to allow server startup to complete
        await Task.Yield();
        
        _logger.LogInformation("Kafka consumer starting for topic: {Topic}", _config.DidCommTopic);

        // ✅ Add retry logic with exponential backoff
        int retryCount = 0;
        const int maxRetries = 5;

        while (!stoppingToken.IsCancellationRequested && retryCount < maxRetries)
        {
            try
            {
                var consumerConfig = new ConsumerConfig
                {
                    BootstrapServers = _config.BootstrapServers,
                    GroupId = "didcomm-consumer-group",
                    AutoOffsetReset = AutoOffsetReset.Latest,
                    // ✅ Reduce timeouts to fail faster
                    SessionTimeoutMs = 6000,
                    SocketTimeoutMs = 3000,
                    // ✅ Add API version fallback for older Kafka
                    ApiVersionRequest = true,
                    ApiVersionFallbackMs = 0
                };

                _consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
                _consumer.Subscribe(_config.DidCommTopic);
                _logger.LogInformation("✅ Kafka consumer started for topic: {Topic}", _config.DidCommTopic);
                
                retryCount = 0; // Reset retry count on success

                while (!stoppingToken.IsCancellationRequested)
                {
                    try
                    {
                        var consumeResult = _consumer.Consume(TimeSpan.FromMilliseconds(1000));
                        if (consumeResult != null)
                        {
                            await ProcessMessage(consumeResult.Message.Value);
                        }
                    }
                    catch (ConsumeException ex)
                    {
                        if (ex.Error.Code == ErrorCode.UnknownTopicOrPart)
                        {
                            _logger.LogWarning(
                                ex,
                                "Kafka topic '{Topic}' does not exist yet. Create it (once) with:\n" +
                                "  docker exec wallet-kafka-1 /opt/kafka/bin/kafka-topics.sh --create \\\n" +
                                "    --topic {Topic} --bootstrap-server {Bootstrap} --partitions 1 --replication-factor 1",
                                _config.DidCommTopic,
                                _config.DidCommTopic,
                                _config.BootstrapServers
                            );
                            await Task.Delay(10000, stoppingToken);
                        }
                        else
                        {
                            _logger.LogWarning(ex, "Kafka consume error (will retry)");
                            await Task.Delay(2000, stoppingToken);
                        }
                    }
                }
                break; // Exit retry loop if we get here
            }
            catch (KafkaException ex)
            {
                retryCount++;
                var delay = Math.Min(1000 * Math.Pow(2, retryCount), 30000); // Exponential backoff, max 30s
                _logger.LogWarning(ex, "⚠️ Kafka connection failed (attempt {Retry}/{Max}). Retrying in {Delay}ms...", 
                    retryCount, maxRetries, delay);
                
                if (retryCount >= maxRetries)
                {
                    _logger.LogError("❌ Kafka connection failed after {Max} retries. Consumer will not start. Messages will only be delivered via direct SignalR broadcast.", maxRetries);
                    break;
                }
                
                await Task.Delay((int)delay, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Kafka consumer stopping...");
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Unexpected error in Kafka consumer");
                retryCount++;
                await Task.Delay(5000, stoppingToken);
            }
        }

        _consumer?.Close();
        _consumer?.Dispose();
    }

    private async Task ProcessMessage(string messageValue)
    {
        try
        {
            var didcommMessage = JsonSerializer.Deserialize<DidCommMessage>(messageValue);
            if (didcommMessage != null)
            {
                _logger.LogInformation("Processing DIDComm message from {From} to {To}", didcommMessage.From, didcommMessage.To);

                // Broadcast to SignalR clients in recipient's DID group
                using var scope = _serviceProvider.CreateScope();
                var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<DidCommHub>>();
                
                // Broadcast to recipient's DID group
                await hubContext.Clients.Group(didcommMessage.To).SendAsync("DidCommMessageReceived", didcommMessage);
                
                _logger.LogInformation("Message broadcast to group: {To}", didcommMessage.To);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process DIDComm message: {Message}", messageValue);
        }
    }

    public override void Dispose()
    {
        _consumer?.Dispose();
        base.Dispose();
    }
}