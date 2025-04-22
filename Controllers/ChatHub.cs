using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Threading.Tasks;
using ImPulse_WebApp.Modules;
using Microsoft.AspNetCore.SignalR;
using Org.BouncyCastle.Asn1;
using Org.BouncyCastle.Crypto.Engines;

namespace ImPulse_WebApp.Controllers
{
    public class ChatHub : Hub
    {
        ConcurrentDictionary<string, Thread> usersStatusMonitoringThreads = new ConcurrentDictionary<string, Thread>();
        public override async Task OnConnectedAsync()
        {
            var httpContext = Context.GetHttpContext();
            string usertag = httpContext.Request.Query["usertag"].ToString();
            var user = UsersHandler.ConnectedUsers.FirstOrDefault(u => u.Key == usertag, new KeyValuePair<string, UserData>(null, null));
            if (user.Key == null)
            {
                await CatchCustomError(Context.ConnectionId, $"User {usertag} hasn't been signed in yet. Please, sign in.");
                return;
            }
            UsersHandler.ConnectedUsers[usertag].ConnectionId = Context.ConnectionId;
            string url = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}/Data/CreateSession?userId={user.Value.UserId}&device=b&sessionToken={user.Value.ConnectionId}";
            await GetRequest(url);

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var pair = UsersHandler.ConnectedUsers.FirstOrDefault(u => u.Value.ConnectionId == Context.ConnectionId, new KeyValuePair<string, UserData>(null, null));
            if (pair.Key != null)
            {
                if (UsersHandler.ConnectedUsers.TryGetValue(pair.Key, out var user))
                {
                    System.Console.WriteLine(user.Usertag + " disconnected");
                    UsersHandler.ConnectedUsers.TryRemove(user.Usertag, out _); // Удаляем пользователя
                    await Clients.All.SendAsync("ReceiveMessage", "Система", $"{user.Usertag} отключился");
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendMsg(string senderUsertag, string getterUsertag, string msg, int msgID)
        {
            if (UsersHandler.ConnectedUsers.TryGetValue(senderUsertag, out var sender) && UsersHandler.ConnectedUsers.TryGetValue(getterUsertag, out var getter))
            {
                await Clients.Client(getter.ConnectionId.ToString()).SendAsync("ReceiveMsg", sender.Usertag, msgID + " " + msg + " " + DateTime.Now.ToString("HH:mm"));
            }
        }

        public async Task SetMessegeRead(string senderUsertag, string getterUsertag, int msgID)
        {
            if (UsersHandler.ConnectedUsers.TryGetValue(senderUsertag, out var sender) && UsersHandler.ConnectedUsers.TryGetValue(getterUsertag, out var getter))
            {
                await Clients.Client(getter.ConnectionId).SendAsync("RecieveMsgRead", sender.Usertag, $"{msgID}");
            }
        }

        public async Task CatchCustomError(string ConnectionId, string errMsg)
        {
            await Clients.Client(ConnectionId).SendAsync("Error", errMsg);
        }

        async Task GetRequest(string url)
        {
            using HttpClient client = new HttpClient();
            HttpResponseMessage response = await client.GetAsync(url);
        }

        public async Task ReportActivity(string myUsertag, string usertag)
        {
            if (UsersHandler.ConnectedUsers.TryGetValue(myUsertag, out var myUser))
            {
                await Clients.Client(myUser.ConnectionId).SendAsync("ReportActivity", usertag, UsersHandler.ConnectedUsers.ContainsKey(usertag));
            }
        }
    }
}
