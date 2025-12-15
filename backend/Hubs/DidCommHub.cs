using Microsoft.AspNetCore.SignalR;

public class DidCommHub : Hub
{
    private readonly ILogger<DidCommHub> _logger;

    public DidCommHub(ILogger<DidCommHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    // Method to join DID-specific group
    public async Task JoinDid(string did)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, did);
        _logger.LogInformation("Client {ConnectionId} joined group for DID: {Did}", Context.ConnectionId, did);
    }

    // Method to leave DID-specific group
    public async Task LeaveDid(string did)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, did);
        _logger.LogInformation("Client {ConnectionId} left group for DID: {Did}", Context.ConnectionId, did);
    }
}