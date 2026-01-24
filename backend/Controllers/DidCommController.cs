using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Text.Json;

[ApiController]
[Route("api")]
public class DidCommController : ControllerBase
{
    private readonly IKafkaProducerService _kafkaProducer;
    private readonly IHubContext<DidCommHub> _hubContext;
    private readonly ILogger<DidCommController> _logger;

    public DidCommController(
        IKafkaProducerService kafkaProducer,
        IHubContext<DidCommHub> hubContext,
        ILogger<DidCommController> logger)
    {
        _kafkaProducer = kafkaProducer;
        _hubContext = hubContext;
        _logger = logger;
    }

    [HttpPost("SendDidCommMessage")]
    public async Task<IActionResult> SendDidCommMessage([FromBody] DidCommMessage message)
    {
        try
        {
            // Basic validation
            if (string.IsNullOrEmpty(message.From) || string.IsNullOrEmpty(message.To))
            {
                return BadRequest(new { error = "From and To fields are required" });
            }

            // 🔐 Validate encryption data is present
            if (message.Encryption == null || string.IsNullOrEmpty(message.Encryption.Ciphertext))
            {
                return BadRequest(new { error = "Encrypted payload is required" });
            }

            // Log the message (encrypted - backend cannot read content)
            _logger.LogInformation("🔐 Received encrypted DIDComm message from {From} to {To}", message.From, message.To);

            // Optional: Verify signature here (simplified for demo)
            if (message.Signature == null || string.IsNullOrEmpty(message.Signature.Value))
            {
                _logger.LogWarning("DIDComm message has no signature");
            }

            // ✅ Try Kafka first, but don't block on failure
            try
            {
                await _kafkaProducer.ProduceAsync("didcomm-messages", message);
                _logger.LogDebug("Message sent to Kafka");
            }
            catch (Exception kafkaEx)
            {
                _logger.LogWarning(kafkaEx, "⚠️ Kafka unavailable, using direct SignalR only");
            }

            // ✅ Always broadcast via SignalR (ensures delivery even if Kafka fails)
            await _hubContext.Clients.Group(message.To).SendAsync("DidCommMessageReceived", message);
            _logger.LogInformation("🔐 Message broadcast to group: {To}", message.To);

            return Ok(new { success = true, messageId = message.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process message");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("Messages")]
    public async Task<IActionResult> GetMessages([FromQuery] string? forDid = null)
    {
        // In production: query from database filtered by DID
        // For demo: return empty array
        return Ok(new { messages = Array.Empty<DidCommMessage>() });
    }
}