using System.Net.Sockets;
using System.Text;
using Serilog;

namespace ImPulse_WebApp.Modules
{
    public class TCPClient
    {
        private TcpClient _client;
        private NetworkStream _stream;
        private bool isExiting;
        private bool isMonitoringRunning = true;
        private Thread monitoringThread;

        // Событие для уведомления о получении сообщения
        public event Action<string> MessageReceived;

        public bool IsConnected { get; private set; }

        private CancellationTokenSource cts = new CancellationTokenSource();


        // Метод для подключения к серверу
        public async Task Connect(string serverHost, int serverPort)
        {
            _client = new TcpClient();

            try
            {
                await _client.ConnectAsync(serverHost, serverPort);
                Log.Information($"Client has been connected to {serverHost}:{serverPort} server.");
                _stream = _client.GetStream();

                // Запуск задачи для приёма сообщений
                Task.Run(() => ReceiveMessages());
                IsConnected = true;
                this.isExiting = false;

                if (this.monitoringThread == null)
                {
                    this.monitoringThread = new Thread(() => MonitorConnection(cts.Token));
                    this.monitoringThread.Start();
                }
            }
            catch (Exception ex)
            {
                Log.Fatal($"Connection error: {ex.Message}.");
                Disconnect();
            }
        }

        // Метод для отправки сообщения конкретному адресу
        public void SendMessageTo(string recipientIp, string message)
        {
            if (_client == null || !_client.Connected)
            {
                Log.Fatal("Connection with server hasn't been established.");
                return;
            }

            // Форматируем сообщение в виде @ip message
            string formattedMessage = $"@{recipientIp} {message}";
            byte[] data = Encoding.UTF8.GetBytes(formattedMessage);

            try
            {
                _stream.Write(data, 0, data.Length);
            }
            catch (Exception ex)
            {
                Log.Error($"Sending message error: {ex.Message}\n{ex.StackTrace}.");
            }
        }

        // Метод для получения сообщений от сервера
        private void ReceiveMessages()
        {
            byte[] buffer = new byte[1024];
            while (true)
            {
                try
                {
                    int bytesRead = _stream.Read(buffer, 0, buffer.Length);
                    if (bytesRead == 0) break;

                    string response = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                    Log.Debug(response);

                    // Вызов события при получении сообщения
                    MessageReceived?.Invoke(response);
                }
                catch
                {
                    Log.Warning("Connection has been lost.");
                    Disconnect();
                    break;
                }
            }
        }

        private async void MonitorConnection(CancellationToken token)
        {
            bool previousVal = this.IsConnected;

            while (!token.IsCancellationRequested)
            {
                Thread.Sleep(180000);
                if (!this.isExiting)
                {
                    Disconnect();
                    Thread.Sleep(60);
                    await this.Connect("185.233.187.93", 9090);
                    Log.Information("Client has been reconnected.");
                }

            }
        }

        // Метод для отключения клиента
        private void Disconnect()
        {
            _stream?.Close();
            _client?.Close();
            this.IsConnected = false;
            Log.Information("Client has been disconnected.");
        }

        public void CloseConnection()
        {
            isExiting = true;
            //cts.Cancel();
            try
            {
                monitoringThread.Abort();
            }
            catch { }
            Disconnect();

        }
    }
}