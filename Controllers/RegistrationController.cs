using System.Data;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using ImPulse_WebApp.Models;
using ImPulse_WebApp.Modules;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace ImPulse_WebApp.Controllers
{
    public class RegistrationController : Controller
    {
        private readonly IConfiguration Configuration;
        private DatabaseConnector databaseConnector;
        private DataTable usersTable;

        public RegistrationController(IConfiguration configuration)
        {
            Configuration = configuration;
            databaseConnector = new DatabaseConnector(Configuration);
            usersTable = databaseConnector.Request("select * from Users;");
            // Console.WriteLine(dt?.Rows[0][1].ToString());
        }

        [HttpGet]
        public IActionResult SignIn()
        {
            System.Console.WriteLine(RegistrationController.GetUserIpAddress(HttpContext));
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> SignIn(UserSignInModel usim)
        {
            if (ModelState.IsValid)
            {
                // TODO: develope normal security checking mechanism
                var user = databaseConnector.Request($"select * from Users where Usertag = '{usim.Usertag}' and PasswordHash = '{usim.Password}';");
                int currentConnection = UsersHandler.ConnectedUsers.Count + 1;
                string hashedUsertag = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(usim.Usertag)));
                if (user.Rows.Count > 0)
                {
                    string usertag = user.Rows[0]["Usertag"]?.ToString() ?? string.Empty;
                    usersTable.Dispose();
                    var userData = new UserData
                    {
                        Username = user.Rows[0]["Username"].ToString(),
                        UserId = int.Parse(user.Rows[0]["UserID"].ToString()),
                        Usertag = usertag,
                        SessionToken = hashedUsertag
                    };
                    UsersHandler.ConnectedUsers.TryAdd(usertag, userData);
                    UsersHandler.Sessions.TryAdd(hashedUsertag, usertag);
                    // TODO: implement generation SessionToken

                    return RedirectToAction("Redirecting", "Messanger", new { token = hashedUsertag });

                }
                ModelState.AddModelError("", "Invalid usertag or password.");
                return View();
            }
            return View();
        }

        [HttpGet]
        public IActionResult SignUp()
        {
            return View();
        }

        [HttpGet]
        public IActionResult CheckUniquenessUsertag(string usertag)
        {
            List<string> users = new List<string>();
            foreach (DataRow row in usersTable.Rows)
            {
                users.Add(row["Usertag"].ToString());
            }
            bool isUnique = !users.Contains(usertag);
            return Json(isUnique);
        }

        [HttpPost]
        public async Task<IActionResult> SignUp(UserRegistrationModel urm)
        {
            if (ModelState.IsValid)
            {
                // TODO: develope normal security checking mechanism
                var isCaptchaValid = await ValidateCaptcha(urm.RecaptchaToken);
                if (!isCaptchaValid)
                {
                    ModelState.AddModelError(string.Empty, "Confirm that you are not a robot.");
                    return View();
                }
                string ip = GetUserIpAddress(HttpContext);
                databaseConnector.Request($"INSERT INTO Users (Username, Usertag, PasswordHash, Salt, IPAddress, LogUp) VALUES ('{urm.Username}', '{urm.Usertag}', '{urm.Password}', 'exampleSalt', '{ip}', '{DateTime.Now:yyyy-MM-dd HH:mm:ss}');");
                usersTable = null;
                return RedirectToAction("SignIn", "Registration");
            }
            return View();
        }


        private async Task<string> GetActiveIp()
        {
            string ip = null;
            using (HttpClient client = new HttpClient())
            {
                ip = await client.GetStringAsync("https://api.ipify.org");
            }
            return ip;
        }

        private async Task<bool> ValidateCaptcha(string token)
        {
            var secret = "6LeCIAsrAAAAACWZcsOEE0_Fz_RVgTzgPyt3QRlU";
            var client = new HttpClient();
            var response = await client.PostAsync($"https://www.google.com/recaptcha/api/siteverify?secret={secret}&response={token}", null);
            var json = response.Content.ReadAsStringAsync().Result;
            dynamic result = JObject.Parse(json);
            return result.success == true;
        }

        public static string GetUserIpAddress(HttpContext context)
        {
            // Проверяем заголовки, если сайт за прокси-сервером
            string? ipAddress = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();

            if (string.IsNullOrEmpty(ipAddress))
            {
                // Если заголовки пусты, используем RemoteIpAddress
                ipAddress = context.Connection.RemoteIpAddress?.ToString();
            }

            return ipAddress ?? "Неизвестный IP";
        }


        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
