using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace ImPulse_WebApp.Modules
{
    public class UserRegistrationModel
    {
        [Required(ErrorMessage = "Enter a username"), MinLength(3, ErrorMessage = "The username must be at least 3 characters"), MaxLength(150, ErrorMessage = "The username must be less than 150 characters")]
        public required string Username { get; set; }

        [Required(ErrorMessage = "Enter a password"), MinLength(6, ErrorMessage = "The password must be at least 6 characters"), MaxLength(128, ErrorMessage = "The password must be less than 128 characters")]
        public required string Password { get; set; }

        [Required(ErrorMessage = "Confirm your password"), Compare("Password", ErrorMessage = "Passwords do not match")]
        public required string ConfirmPassword { get; set; }

        [Required(ErrorMessage = "Enter a usertag"), MinLength(5, ErrorMessage = "The usertag must be at least 5 symbols"), MaxLength(200, ErrorMessage = "The usertag must be less than 200 symbols")]
        public required string Usertag { get; set; }
        // [Length(20, 20, ErrorMessage = "Please enter 20 characters")]
        // public required string SecretKey { get; set; }

        [Required]
        public string RecaptchaToken { get; set; }
    }
}