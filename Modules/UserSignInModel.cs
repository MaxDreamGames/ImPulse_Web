using System.ComponentModel.DataAnnotations;

namespace ImPulse_WebApp.Modules
{
    public class UserSignInModel
    {
        [Required(ErrorMessage = "Enter a username"), MinLength(3, ErrorMessage = "The usertag must be at least 3 characters"), MaxLength(150, ErrorMessage = "The username must be less than 150 characters")]
        public required string Usertag { get; set; }

        [Required(ErrorMessage = "Enter a password"), MinLength(3, ErrorMessage = "The password must be at least 3 characters"), MaxLength(128, ErrorMessage = "The password must be less than 128 characters")]
        public required string Password { get; set; }
    }
}