using Confluent.Kafka;
using Microsoft.Extensions.Options;
using System.Text.Json;

public interface IKafkaProducerService
{
    Task ProduceAsync<T>(string topic, T message);
}

public class KafkaProducerService : IKafkaProducerService, IDisposable
{
    private readonly IProducer<string, string> _producer;
    private readonly ILogger<KafkaProducerService> _logger;

    public KafkaProducerService(IOptions<KafkaConfig> config, ILogger<KafkaProducerService> logger)
    {
        _logger = logger;
        
        var producerConfig = new ProducerConfig
        {
            BootstrapServers = config.Value.BootstrapServers,
            Acks = Acks.Leader
        };

        _producer = new ProducerBuilder<string, string>(producerConfig).Build();
    }

    public async Task ProduceAsync<T>(string topic, T message)
    {
        try
        {
            var serializedMessage = JsonSerializer.Serialize(message);
            var result = await _producer.ProduceAsync(topic, new Message<string, string>
            {
                Key = Guid.NewGuid().ToString(),
                Value = serializedMessage
            });

            _logger.LogInformation("Message produced to Kafka topic {Topic} at offset {Offset}", topic, result.Offset);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to produce message to Kafka topic {Topic}", topic);
            throw;
        }
    }

    public void Dispose()
    {
        _producer?.Dispose();
    }
}