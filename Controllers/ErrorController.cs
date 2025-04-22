using Microsoft.AspNetCore.Mvc;

namespace ImPulse_WebApp.Controllers
{
    public class ErrorController : Controller
    {
        public IActionResult Error(string err)
        {
            return View(err);
        }

        public IActionResult ComingSoon()
        {
            return View();
        }
    }
}
