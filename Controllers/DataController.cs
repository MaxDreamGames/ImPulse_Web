using System.Data;
using System.Diagnostics;
using ImPulse_WebApp.Models;
using ImPulse_WebApp.Modules;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace ImPulse_WebApp.Controllers
{
    public class DataController : Controller
    {
        private readonly IConfiguration Configuration;
        private DatabaseConnector databaseConnector;

        public DataController(IConfiguration configuration)
        {
            Configuration = configuration;
            databaseConnector = new DatabaseConnector(Configuration);
        }

        public IActionResult Data()
        {
            return View();
        }

        [HttpGet]
        public IActionResult GetUserFromDatabase(string usertag)
        {
            var user = databaseConnector.Request($"select UserID, Username, Usertag, LogUp from Users where usertag = '{usertag}';");
            if (user.Rows.Count == 0)
                return NotFound();
            var status = databaseConnector.Request($"select IsOnline, ExpiresAt from UserSessions where UserID = {user.Rows[0]["UserID"].ToString()};");
            string jsonObj = null;
            if (status.Rows.Count > 0)
            {
                var statusRow = status.Rows[status.Rows.Count - 1];
                var tableOfUser = databaseConnector.Request($"select Users.UserID, Users.Username, Users.Usertag, Users.LogUp, UserSessions.IsOnline, UserSessions.ExpiresAt from Users join UserSessions on UserSessions.UserID = Users.UserID where Users.Usertag = '{usertag}' order by UserSessions.SessionID desc;");
                jsonObj = JsonConvert.SerializeObject(tableOfUser);
            }
            else
            {

                user.Columns.Add("IsOnline", Type.GetType("System.Boolean"));
                user.Columns.Add("ExpiresAt", Type.GetType("System.DateTime"));
                jsonObj = JsonConvert.SerializeObject(user);
            }
            return Json(jsonObj);
        }


        [HttpGet]
        public IActionResult GetOpponentsByChat(string chatID, string senderUsertag)
        {
            string senderID = databaseConnector.Request($"SELECT UserID FROM Users WHERE Usertag = '{senderUsertag}';").Rows[0][0].ToString();
            string getterID = databaseConnector.Request($"SELECT UserID FROM UserChats WHERE ChatID = {chatID} AND UserID != {senderID};").Rows[0][0].ToString();
            var getterUsertag = databaseConnector.Request($"SELECT Username, Usertag FROM Users WHERE UserID = {getterID};");
            return Json(JsonConvert.SerializeObject(getterUsertag));
        }

        [HttpGet]
        public IActionResult GetMessages(int chatId)
        {
            if (chatId == -1)
            {
                return Json("None");
            }
            var msgs = databaseConnector.Request($"select * from Messages where ChatId = {chatId};");
            string jsonObj = JsonConvert.SerializeObject(msgs);
            return Json(jsonObj);
        }

        [HttpGet]
        public IActionResult GetNextMsgId()
        {
            int nextMsgId = databaseConnector.Request("select MessageId from Messages;").Rows.Count + 1;
            return Json(nextMsgId.ToString());
        }

        [HttpGet]
        public IActionResult GetChat(string senderUsertag, string getterUsertag)
        {
            var chat = databaseConnector.Request($"SELECT c.*, u.Username FROM Chats c JOIN Users u ON u.Usertag = '{getterUsertag}' WHERE c.Chattag = '{senderUsertag},{getterUsertag}' OR c.Chattag = '{getterUsertag},{senderUsertag}';");
            return Json(JsonConvert.SerializeObject(chat));
        }

        [HttpGet]
        public IActionResult CreateSession(int userId, string device, string sessionToken)
        {
            databaseConnector.Request($"INSERT INTO UserSessions (UserID, IPAddress, DeviceInfo, SessionToken, ExpiresAt, IsOnline)" +
                $" VALUES ({userId}, 'somee-ip', '{device}', '{sessionToken}', '{DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")}', TRUE);");
            System.Console.WriteLine("Creating session");
            return Ok();
        }


        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
