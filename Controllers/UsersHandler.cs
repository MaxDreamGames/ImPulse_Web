using System.Collections.Concurrent;

namespace ImPulse_WebApp.Controllers
{
    public static class UsersHandler
    {
        public static ConcurrentDictionary<string, UserData> ConnectedUsers = new ConcurrentDictionary<string, UserData>();
        public static ConcurrentDictionary<string, string> Sessions = new ConcurrentDictionary<string, string>(); 
    }
}