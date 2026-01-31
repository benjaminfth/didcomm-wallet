using System.Text.Json.Serialization;

public class DidCommMessage
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
    
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;
    
    [JsonPropertyName("from")]
    public string From { get; set; } = string.Empty;
    
    [JsonPropertyName("to")]
    public string To { get; set; } = string.Empty;
    
    [JsonPropertyName("created_time")]
    public string? CreatedTime { get; set; }
    
    [JsonPropertyName("thid")]
    public string? Thid { get; set; }  // Thread ID for ACKs and responses
    
    [JsonPropertyName("body")]
    public object? Body { get; set; }
    
    [JsonPropertyName("encryption")]
    public EncryptionData? Encryption { get; set; }
    
    [JsonPropertyName("signature")]
    public SignatureData? Signature { get; set; }
}

public class EncryptionData
{
    [JsonPropertyName("alg")]
    public string Alg { get; set; } = string.Empty;
    
    [JsonPropertyName("ephemeralPublicKey")]
    public string EphemeralPublicKey { get; set; } = string.Empty;
    
    [JsonPropertyName("iv")]
    public string Iv { get; set; } = string.Empty;
    
    [JsonPropertyName("ciphertext")]
    public string Ciphertext { get; set; } = string.Empty;
    
    [JsonPropertyName("tag")]
    public string Tag { get; set; } = string.Empty;
}

public class SignatureData
{
    [JsonPropertyName("alg")]
    public string Alg { get; set; } = string.Empty;
    
    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;
    
    [JsonPropertyName("r")]
    public string? R { get; set; }
    
    [JsonPropertyName("s")]
    public string? S { get; set; }
}
