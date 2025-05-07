using System.Collections;
using System.Data;
using System.Diagnostics;
using System.Net.Sockets;
using ImPulse_WebApp.Models;
using ImPulse_WebApp.Modules;
using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;
using Newtonsoft.Json;

namespace ImPulse_WebApp.Controllers
{
    public class MessangerController(IConfiguration configuration) : Controller
    {
        private readonly IConfiguration Configuration = configuration;
        private DatabaseConnector databaseConnector = new DatabaseConnector(configuration);
        private DataTable usersTable;
        private string Usertag;
        public Dictionary<string, string> user = new Dictionary<string, string>();


        public IActionResult Redirecting(string token){
            ViewBag.token = token;
            return View();
        }

        public IActionResult All(string token)
        {
            Usertag = UsersHandler.ConnectedUsers.FirstOrDefault(u => u.Value.SessionToken == token).Key;
            user.Add("I", Usertag);
            return View(user);
        }


        [HttpGet]
        public IActionResult SetUsersTable()
        {
            usersTable = databaseConnector.Request($"select * from Users where not Usertag = '{Usertag}';");
            Hashtable table = new Hashtable();
            foreach (DataRow row in usersTable.Rows)
            {
                if (row["Usertag"].ToString() == Usertag)
                    continue;
                table.Add(row["Usertag"].ToString(), row["Username"].ToString());
            }
            return Json(JsonConvert.SerializeObject(table));
        }


        [HttpGet]
        public IActionResult SearchUsers(string searchString)
        {
            return Json(searchString);
        }

        public IActionResult SetChatElement(string usertag)
        {
            return PartialView("ChatItem", usertag);
        }

        [HttpPost]
        // public IActionResult SendMsg(string senderUsertag, string getterUsertag, string message)
        public async Task<IActionResult> SendMsg([FromBody] SendMessageRequest request)
        {
            var senderUsertag = request.SenderUsertag;
            var getterUsertag = request.GetterUsertag;
            var message = request.Message;
            var senderUser = databaseConnector.Request($"select UserID, Username from Users where Usertag = '{senderUsertag}'");
            var getterUser = databaseConnector.Request($"select UserID, Username from Users where Usertag = '{getterUsertag}'");
            var chatIDTable = databaseConnector.Request($"SELECT ChatID FROM UserChats WHERE UserID IN ({senderUser.Rows[0][0]}, {getterUser.Rows[0][0]}) GROUP BY ChatID HAVING COUNT(UserID) = 2;");
            string currentTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            string currentShortDate = DateTime.Now.ToString("HH:mm");
            int chatID = -1;
            if (chatIDTable.Rows.Count == 0)
            {
                int newChatId = databaseConnector.Request($"select ChatID from Chats").Rows.Count + 1;
                databaseConnector.Request($"INSERT INTO Chats (ChatID, ChatName, IsGroup, Created, Chattag) VALUES ({newChatId}, '{getterUser.Rows[0][1].ToString()}', FALSE, '{currentTime}', '{senderUsertag},{getterUsertag}');");
                databaseConnector.Request($"INSERT INTO UserChats (UserID, ChatID) VALUES ({getterUser.Rows[0][0].ToString()}, {newChatId});");
                databaseConnector.Request($"INSERT INTO UserChats (UserID, ChatID) VALUES ({senderUser.Rows[0][0].ToString()}, {newChatId});");
                chatID = newChatId;
            }
            else
                chatID = int.Parse(chatIDTable.Rows[0][0].ToString());
            int msgId = databaseConnector.Request($"SELECT MessageID FROM Messages").Rows.Count + 1;
            string query = "INSERT INTO Messages (MessageID, ChatID, SenderID, Content, Timestamp, Status) " +
               "VALUES (@msgId, @chatID, @senderID, @message, @currentTime, @status)";

            using (var conn = databaseConnector.Connect(false)) // если у тебя есть метод для получения соединения
            {
                using (var cmd = new MySqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@msgId", msgId);
                    cmd.Parameters.AddWithValue("@chatID", chatID);
                    cmd.Parameters.AddWithValue("@senderID", senderUser.Rows[0][0]);
                    cmd.Parameters.AddWithValue("@message", message);
                    cmd.Parameters.AddWithValue("@currentTime", currentTime);
                    cmd.Parameters.AddWithValue("@status", 0);

                    cmd.ExecuteNonQuery();
                }
            }

            databaseConnector.Request($"UPDATE Chats SET LastMsgID = {msgId} Where ChatID = {chatID};");
            Dictionary<string, string> jsonOutput = new Dictionary<string, string>();
            jsonOutput.Add("Time", currentShortDate);
            return Json(jsonOutput);
        }

        [HttpPost]
        public IActionResult LogOut(string usertag)
        {
            UsersHandler.Sessions.Remove(UsersHandler.Sessions.FirstOrDefault(u => u.Value == usertag).Key, out string _);
            string userId = databaseConnector.Request($"select UserID from Users where Usertag = '{usertag}';").Rows[0][0].ToString();
            var session = databaseConnector.Request($"select IsOnline, SessionID from UserSessions where UserID = {userId} order by SessionID desc;");
            if (session.Rows.Count > 0)
            {
                databaseConnector.Request($"UPDATE UserSessions SET ExpiresAt = '{DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")}' WHERE SessionID = {session.Rows[0][1]}");
                if (session.Rows[0][0].ToString() == "True")
                {
                    databaseConnector.Request($"UPDATE UserSessions SET IsOnline = FALSE WHERE SessionID = {session.Rows[0][1]}");
                }
            }
            return Ok();
        }

        [HttpGet]
        public IActionResult SetOnlineStatus(string usertag)
        {
            string userId = databaseConnector.Request($"select UserID from Users where Usertag = '{usertag}';").Rows[0][0].ToString();
            var session = databaseConnector.Request($"select IsOnline, SessionID from UserSessions where UserID = {userId} order by SessionID desc;");
            if (session.Rows.Count > 0)
            {
                databaseConnector.Request($"UPDATE UserSessions SET IsOnline = TRUE WHERE SessionID = {session.Rows[0][1]}");
            }
            return Ok();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        [HttpGet]
        public IActionResult SetChatList(string usertag)
        {
            string userId = databaseConnector.Request($"select UserId from Users where Usertag = '{usertag}';").Rows[0][0].ToString();
            var chatList = databaseConnector.Request($"SELECT c.ChatID, c.ChatName, c.IsGroup, c.Created, c.LastMsgID, c.Chattag, m.Content, m.Timestamp, m.Status, CASE WHEN m.SenderID = {userId} THEN 1 ELSE 0 END AS IsMine, (SELECT COUNT(MessageID) FROM Messages WHERE Status = 0 AND ChatID = c.ChatID AND SenderID != {userId}) AS UnreadCount FROM Chats c JOIN UserChats uc ON c.ChatID = uc.ChatID LEFT JOIN Messages m ON c.LastMsgID = m.MessageID WHERE uc.UserID = {userId} ORDER BY m.Timestamp DESC;");
            return Json(JsonConvert.SerializeObject(chatList));
        }


        [HttpGet]
        public IActionResult SetMessagesStatus(string changePersonUsertag, int chatID, int status)
        {
            databaseConnector.Request($"UPDATE Messages SET Status = {status} WHERE ChatID = {chatID} AND SenderID = (SELECT UserID FROM Users WHERE Usertag = '{changePersonUsertag}');");
            return Ok();
        }

        [HttpGet]
        public IActionResult SetMessageStatus(int msgId, int status)
        {
            databaseConnector.Request($"UPDATE Messages SET Status = {status} WHERE MessageID = {msgId};");
            return Ok();
        }

        public class SendMessageRequest
        {
            public string SenderUsertag { get; set; }
            public string GetterUsertag { get; set; }
            public string Message { get; set; }
        }
    }
}
