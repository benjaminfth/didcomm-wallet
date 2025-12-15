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

            // Log the message
            _logger.LogInformation("Received DIDComm message from {From} to {To}", message.From, message.To);

            // Optional: Verify signature here (simplified for demo)
            if (string.IsNullOrEmpty(message.Signature))
            {
                _logger.LogWarning("DIDComm message has no signature");
            }

            // Send to Kafka
            await _kafkaProducer.ProduceAsync("didcomm-messages", message);

            // Broadcast to recipient's DID group via SignalR
            await _hubContext.Clients.Group(message.To).SendAsync("DidCommMessageReceived", message);
            _logger.LogInformation("Message broadcast to group: {To}", message.To);

            return Ok(new { success = true, messageId = message.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process DIDComm message");
            return StatusCode(500, new { error = "Internal server error" });
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