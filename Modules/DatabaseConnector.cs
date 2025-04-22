using System.Data;
using MySql.Data.MySqlClient;

namespace ImPulse_WebApp.Modules
{
    public class DatabaseConnector
    {
        IConfigurationSection user;
        IConfigurationSection admin;

        public DatabaseConnector(IConfiguration configuration)
        {
            user = configuration.GetSection("UserDatabase");
            admin = configuration.GetSection("RootDatabase");
        }
        public MySqlConnection GetConnection(string host, int port, string database, string username, string password)
        {
            string connectionString = $"Server={host};Database={database};port={port};User Id={username};password={password};charset=utf8";
            connectionString = "server=185.233.187.93;database=impulse_db;port=3306;user id=impulse_user;password=V98EJz[BK6?wIT(K7X0Em}!};characterset=utf8";
            MySqlConnection connection = new MySqlConnection(connectionString);
            return connection;
        }

        public MySqlConnection Connect(bool isAdmin)
        {
            MySqlConnection sqlConnection = GetConnection(user.GetValue<string>("Host"), user.GetValue<int>("Port"), user.GetValue<string>("Database"), user.GetValue<string>("Username"), user.GetValue<string>("Password"));
            if (isAdmin)
            {
                sqlConnection = GetConnection(user.GetValue<string>("Host"), user.GetValue<int>("Port"), user.GetValue<string>("Database"), admin.GetValue<string>("Username"), admin.GetValue<string>("Password"));
            }
            sqlConnection.Open();
            return sqlConnection;
        }

        public DataTable Request(string request, bool isAdmin = false)
        {
            try
            {
                MySqlConnection connection = Connect(isAdmin);
                MySqlCommand cmd = new MySqlCommand(request, connection);
                MySqlDataAdapter adapter = new MySqlDataAdapter(cmd);
                DataTable dt = new DataTable();
                adapter.Fill(dt);
                connection.Close();
                return dt;
            }
            catch (Exception ex)
            {
                System.Console.WriteLine(ex.Message);
                return null;
            }
        }
    }
}