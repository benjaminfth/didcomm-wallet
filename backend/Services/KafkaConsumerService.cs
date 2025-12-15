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

        try
        {
            var consumerConfig = new ConsumerConfig
            {
                BootstrapServers = _config.BootstrapServers,
                GroupId = "didcomm-consumer-group",
                AutoOffsetReset = AutoOffsetReset.Latest,
                // Add connection timeout to prevent blocking
                SessionTimeoutMs = 10000,
                SocketTimeoutMs = 5000
            };

            _consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
            _consumer.Subscribe(_config.DidCommTopic);
            _logger.LogInformation("Kafka consumer started for topic: {Topic}", _config.DidCommTopic);

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
                    _logger.LogWarning(ex, "Kafka consume error (will retry)");
                    // Wait before retry to avoid spamming logs
                    await Task.Delay(2000, stoppingToken);
                }
                catch (KafkaException ex)
                {
                    _logger.LogWarning(ex, "Kafka connection error (will retry in 5s)");
                    await Task.Delay(5000, stoppingToken);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Expected when cancellation is requested
            _logger.LogInformation("Kafka consumer stopping...");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kafka consumer failed to start - continuing without Kafka");
        }
        finally
        {
            _consumer?.Close();
            _consumer?.Dispose();
        }
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