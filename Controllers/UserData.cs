using System.Security.Policy;

namespace ImPulse_WebApp.Controllers
{
    public class UserData
    {
        public int UserId { get; set; }
        public string ConnectionId { get; set; }
        public string Username { get; set; }
        public string Usertag { get; set; }
        public string SessionToken { get; set; }
    }
}