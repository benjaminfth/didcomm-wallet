using Microsoft.AspNetCore.SignalR;
using Confluent.Kafka;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Enable detailed logging
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Debug);

// Configure to listen on port 7001 with explicit Kestrel setup
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    Console.WriteLine("Configuring Kestrel to listen on port 7001...");
    serverOptions.ListenLocalhost(7001, listenOptions =>
    {
        listenOptions.UseHttps();
        Console.WriteLine("HTTPS listener configured on localhost:7001");
    });
});

// Add services
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // ✅ Use camelCase for JSON serialization (JavaScript convention)
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        // ✅ Use camelCase for SignalR JSON as well
        options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

// Add CORS for wallet extension
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://127.0.0.1:5500", "http://localhost:5500", "https://localhost:*")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Kafka configuration
builder.Services.Configure<KafkaConfig>(builder.Configuration.GetSection("Kafka"));
builder.Services.AddSingleton<IKafkaProducerService, KafkaProducerService>();
builder.Services.AddHostedService<KafkaConsumerService>();

var app = builder.Build();

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseRouting();
app.UseCors();

app.MapControllers();
app.MapHub<DidCommHub>("/didcommhub");

Console.WriteLine("Starting server...");

// Log the listening URL
app.Lifetime.ApplicationStarted.Register(() =>
{
    Console.WriteLine("==============================================");
    Console.WriteLine("Backend is now listening on: https://localhost:7001");
    Console.WriteLine("SignalR Hub: https://localhost:7001/didcommhub");
    Console.WriteLine("API Endpoint: POST https://localhost:7001/api/SendDidCommMessage");
    Console.WriteLine("==============================================");
});

Console.WriteLine("Calling app.Run()...");
app.Run();
Console.WriteLine("app.Run() completed (this should never print).");

// Configuration classes
public class KafkaConfig
{
    public string BootstrapServers { get; set; } = "localhost:9092";
    public string DidCommTopic { get; set; } = "didcomm-messages";
}