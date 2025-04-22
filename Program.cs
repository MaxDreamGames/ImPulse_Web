using ImPulse_WebApp.Controllers;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
.Enrich.FromLogContext()
.WriteTo.Console()
.WriteTo.File("logs/log.log")
.CreateLogger();

// Add services to the container.
builder.Services.AddControllersWithViews();
var mvcBuilder = builder.Services.AddRazorPages();
if (builder.Environment.IsDevelopment())
    mvcBuilder.AddRazorRuntimeCompilation();
builder.Services.AddSignalR();
builder.Services.AddControllers().AddNewtonsoftJson();
var app = builder.Build();

app.Urls.Add("http://*:5163");
app.Urls.Add("https://*:5164");



app.MapHub<ChatHub>("/chathub");

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

if (builder.Environment.IsProduction()) {
    app.UseDeveloperExceptionPage();
    app.UseBrowserLink();
}

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
