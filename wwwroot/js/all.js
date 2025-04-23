var userTable = null;
var usertag = null;
var hubConnection = null;
var globalChatList = new Object();
var isOnFocus = true;
var isSearching = false;
var isReadyForSearchingCancellation = false;
var isRefreshed = false;
sessionStorage.setItem("justReloaded", "false");

window.addEventListener("beforeunload", function () {
    sessionStorage.setItem("justReloaded", "true");
    navigator.sendBeacon(`/Messanger/LogOut?usertag=${document.getElementById('current-usertag').innerText}`);
})

window.addEventListener('load', () => {
    const screenWidth = Number(getComputedStyle(document.querySelector('html')).width.replace('px', ''));
    handleResizing(screenWidth);

    const navEntries = performance.getEntriesByType('navigation');
    if (sessionStorage.getItem("justReloaded") === "true") {
        sessionStorage.setItem("justReloaded", "false");
        console.log("Это была перезагрузка!");
        // Выполни здесь нужную функцию
    }
});

var lastWidth = Number(getComputedStyle(document.querySelector('html')).width.replace('px', ''));
window.addEventListener('resize', () => {
    const screenWidth = Number(getComputedStyle(document.querySelector('html')).width.replace('px', ''));

    if (screenWidth !== lastWidth) {
        console.log(screenWidth);
        handleResizing(screenWidth);
        lastWidth = screenWidth;
    }
});

window.addEventListener('focus', () => {
    isOnFocus = true;
    setAllNewMsgsRead();
});

window.addEventListener('blur', () => {
    isOnFocus = false;
});

function catchError(err) {
    alert(err.toString());
    window.location.href = window.location['origin'].toString() + '/Error/Error';
}

document.addEventListener('DOMContentLoaded', () => {
    const burgerButton = document.querySelector('.burger-button');
    const chatPanel = document.querySelector('.chat-panel');
    const chatZone = document.querySelector('.chat-zone');
    

    burgerButton.addEventListener('click', () => {
        chatPanel.classList.toggle('hidden');
        if (chatPanel.classList.contains('hidden')) 
            document.querySelectorAll('.unread-icon').forEach(el => el.classList.add('hidden'));
        else
            document.querySelectorAll('.unread-icon').forEach(el => el.classList.remove('hidden'));
        document.getElementById('chat-search-list').style.display = 'none';

        if (Number(getComputedStyle(document.querySelector('html')).width.replace('px', '')) < 624) {
            chatZone.classList.toggle('hidden', !chatPanel.classList.contains('hidden'));
            if (!chatPanel.classList.contains('hidden')) {
                chatPanel.style.width = '100%';
            }
        }
        else {
            chatPanel.removeAttribute('style');
            chatZone.classList.remove('hidden');
        }

    });
    usertag = document.getElementById('current-usertag').innerText;

    hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(`/chathub?usertag=${usertag}`)
        .build();
    hubConnection.on('ReceiveMsg', (user, message) => {
        receiveMessage(user, message);
    });

    hubConnection.on('RecieveMsgRead', (user, msgID) => {
        markAsRead(user, msgID);
    })

    hubConnection.on('ReportActivity', (user, stat) => {
        const chatStatus = document.getElementById('chat-status');
        if (stat == 1 && chatStatus.textContent != 'Online')
            chatStatus.textContent = 'Online';
        else if (stat == 0 && chatStatus.textContent == 'Online') {
            fetch('/Data/GetUserFromDatabase?usertag=' + user)
                .then(response => response.json())
                .then(us => {
                    us = JSON.parse(us);
                    chatStatus.textContent = setTimeStatus(us[0]['ExpiresAt']);
                });
        }
    });

    hubConnection.on('Error', (err) => {
        alert('Error: ' + err);
        window.location.href = window.location['origin'].toString() + '/Registration/SignIn';
    });

    setInterval(() => {
        if (document.getElementById('chat-usertag').textContent != '') {
            hubConnection.invoke('ReportActivity', document.getElementById('current-usertag').textContent, document.getElementById('chat-usertag').textContent);
        }
    }, 2000);

    hubConnection.start().catch((err) => catchError(err));

    window.addEventListener("beforeunload", () => {
        hubConnection.stop(); // Корректное отключение
    });


    var usertag = document.getElementById('current-usertag').innerText;
    fetch('/Data/GetUserFromDatabase?usertag=' + usertag)
        .then(response => response.json())
        .then(user => {
            user = JSON.parse(user)[0];
            userTable = user;

        });
    setChatList(usertag);

});

Notification.requestPermission().then(function (res) {
    console.log(res);
});

document.onmousemove = (e) => {
    if (isSearching && e.clientX > document.getElementById("chat-list").offsetWidth) {
        isReadyForSearchingCancellation = true;
    }
    else if (isSearching && e.clientX < document.getElementById("chat-list").offsetWidth)
        isReadyForSearchingCancellation = false;
};

document.onclick = (e) => {
    // if (isReadyForSearchingCancellation && !isSearching && !checkActiveSearchElement()) {

    //     toggleSearch(false);
    // }
}

function checkActiveSearchElement() {
    const searchList = document.getElementById('chat-search-list');
    var chats = searchList.children;
    for (var i = 0; i < chats.length; i++) {
        var chat = chats[i];
        if (chat.querySelector(':hover')) return true;
    }
    return false;
}
document.getElementById('search-input').addEventListener('focusin', () => { toggleSearch(true); isSearching = true; });
document.getElementById('search-input').addEventListener('focusout', () => {
    isSearching = false;
    if (document.getElementById('search-input').value.length < 1) {
        toggleSearch(false);
    }
});
document.getElementById('search-input').addEventListener('input', () => searchUsers());
document.getElementById('send-button').addEventListener('click', () => sendMessage());
document.getElementById('message-input').addEventListener('keyup', (e) => {
    if (e.code == 'Enter' && e.shiftKey) {
        document.getElementById('message-input').value += '\n';
        e.preventDefault();
    }
    else if (e.code == 'Enter') {
        document.getElementById('message-input').value = document.getElementById('message-input').value.trim();
        sendMessage();
        e.preventDefault();
    }

});

function handleResizing(size) {
    const chatPanel = document.getElementById('chat-panel')
    const chatZone = document.getElementById('chat-zone')
    const burgerButton = document.querySelector('.burger-button');

    if (size < 624 && !isSearching) {
        chatPanel.classList.add('hidden');
        document.querySelectorAll('.unread-icon').forEach(el => el.classList.add('hidden'));
    }
    else if (size >= 624) {
        chatPanel.classList.remove('hidden');
        chatPanel.style.removeProperty('width');
        chatZone.classList.remove('hidden');
    }
}
function toggleSearch(isStarting) {
    const searchList = document.getElementById('chat-search-list');
    const chatList = document.getElementById('chat-list');
    const chatUsertag = document.getElementById('chat-usertag');
    if (isStarting) {
        const element = Array.from(document.querySelectorAll('.chatlist-usertag'))
            .find(el => el.textContent.trim() == chatUsertag.textContent);
        if (element)
            element.parentElement.style.backgroundColor = 'rgba(47, 29, 76, 0.8)';
        chatList.style.display = 'none';
        searchList.style.display = 'block';
        fetch(`/Messanger/SetUsersTable`)
            .then(response => response.json())
            .then(table => {
                table = JSON.parse(table);
                userTable = table;
            });
    } else {
        chatList.style.display = 'block';
        searchList.style.display = 'none';
        userTable = null;
    }
}

function searchUsers() {
    const searchInput = document.getElementById('search-input');
    const searchValue = searchInput.value.toLowerCase();
    const chatSearchList = document.getElementById('chat-search-list');
    const existingChats = Array.from(document.querySelectorAll('.chatlist-usertag'));

    clearChatSearchItems();
    if (searchValue.length == 0) {
        toggleSearch(false);
        return;
    }
    if (searchValue.length == 1) {
        toggleSearch(true);
    }

    for (const key in userTable) {
        const user = userTable[key];
        if (key == document.getElementById('current-usertag').innerText) {
            continue;
        }

        if (key.startsWith(searchValue) || user.toLowerCase().startsWith(searchValue)) {
            var existingChat = null;
            for (const chat of existingChats) {
                if (chat.textContent == key) {
                    existingChat = chat.parentElement.parentElement.cloneNode(true);
                    break;
                }
            }
            if (existingChat) {
                chatSearchList.prepend(existingChat);
                const usertag = existingChat.querySelector('.chatlist-usertag').textContent;
                const chatId = existingChat.querySelector('.chat-id').textContent;
                existingChat.addEventListener('click', () => openChat(usertag, chatId));
                continue;
            }

            const chatItem = `
            <div class="chat-item" id="${key}-search-item">
                <img src="" alt="" class="chat-avatar">
                <div class="chat-details">
                    <div class="chat-item-header">
                        <h3 class="chat-name">${user}</h3>
                    </div>
                    <div class="chat-preview">
                        <span class="chat-status"></span>
                        <p class="chat-last-message">${key}</p>
                    </div>
                    <div class="chat-time"></div>
                </div>
                <div class="chat-notification">
                    
                </div>
                </div>
                        `;
            const div = document.createElement('div');
            div.innerHTML = chatItem;
            chatSearchList.appendChild(div);
            document.getElementById(`${key}-search-item`).addEventListener('click', () => openChat(key, -1));
        }
    }
}

function clearChatSearchItems() {
    const chatSearchList = document.getElementById('chat-search-list');
    while (chatSearchList.firstChild) {
        chatSearchList.removeChild(chatSearchList.firstChild);
    }
}

function setChatList(usertag) {
    const chatList = document.getElementById('chat-list');
    const senderUsertag = document.getElementById('current-usertag').innerText;
    while (chatList.firstChild)
        chatList.removeChild(chatList.firstChild);

    fetch(`/Messanger/SetChatList?usertag=${usertag}`)
        .then(response => response.json())
        .then(table => {
            table = JSON.parse(table);
            for (var i in table) {
                const item = table[i];
                console.log(item);
                var chatName = '';
                var chattag = '';
                fetch(`/Data/GetOpponentsByChat?chatID=${item['ChatID']}&senderUsertag=${senderUsertag}`)
                    .then(response => response.json())
                    .then(user => {
                        user = JSON.parse(user);
                        chatName = String(user[0]['Username']);
                        chattag = user[0]['Usertag'];
                        globalChatList[chattag] = item;
                        var messageIcon = '';
                        var unreadCount = '';
                        if (item['IsMine'] == 1) {
                            if (item['Status'] == 0)
                                messageIcon = `
                            <span class="chat-status">
                            <img src="/imgs/Sent.png" alt="0" class="status-icon">
                            </span>`;
                            else if (item['Status'] == 1)
                                messageIcon = `
                            <span class="chat-status">
                            <img src="/imgs/Received.png" alt="1" class="status-icon">
                            </span>`;
                            else if (item['Status'] == 2)
                                messageIcon = `
                            <span class="chat-status">
                            <img src="/imgs/Read.png" alt="2" class="status-icon">
                            </span>`;
                        }
                        else {
                            messageIcon = `
                            <span class="chat-status" style="display: none;"></span>`;
                        }
                        if (item['UnreadCount'] > 0)
                            unreadCount = `<span class="unread-icon">${item['UnreadCount']}</span>`;
                        else
                            unreadCount = `<span class="unread-icon" style="display: none;"></span>`;
                        if (item['Content'].includes('\n'))
                            item['Content'] = item['Content'].slice(0, item['Content'].indexOf('\n') + 1) + '...';

                        const chatItem = `
                    <div class="chat-item">
                    <p class="chatlist-usertag" style="display: none;">${chattag}</p>
                    <p class="chat-id" style="display: none;">${item['ChatID']}</p>
                    <img src="" alt="" class="chat-avatar">
                    <div class="chat-details">
                    <div class="chat-item-header">
                    <h3 class="chat-name">${chatName}</h3>
                    </div>
                    <div class="chat-preview">
                    ${messageIcon}
                    <p class="chat-last-message">${item['Content']}</p>
                    </div>
                    <div class="chat-time">${String(item['Timestamp']).slice(-8, -3)}</div>
                    </div>
                    <div class="chat-notification">
                    ${unreadCount}
                    </div>
                        </div>
                        `;
                        const div = document.createElement('div');
                        div.innerHTML = chatItem;
                        globalChatList[chattag]["Element"] = div.innerHTML;
                        if (item['IsMine'] == 0) {
                            div.querySelector('.chat-status').style.display = 'none';
                        }

                        let sortedChats = Object.values(globalChatList).sort((a, b) => new Date(b['Timestamp']) - new Date(a['Timestamp']));
                        chatList.innerHTML = '';


                        sortedChats.forEach(chat => {
                            const div = document.createElement('div');
                            div.innerHTML = chat['Element']
                            chatList.appendChild(div);
                            div.addEventListener('click', () => openChat(div.querySelector('.chatlist-usertag').textContent, div.querySelector('.chat-id').textContent))
                        });
                    });
            }

            document.getElementById('chat-empty-block').style.display = 'none';
        });
}


function openChat(usertag, chatId) {
    const chatName = document.getElementById('chat-name');
    const chatUsertag = document.getElementById('chat-usertag');
    const chatUserID = document.getElementById('chat-userID');
    const chatAvatar = document.getElementById('chat-avatar');
    const chatStatus = document.getElementById('chat-status');


    if (Number(getComputedStyle(document.querySelector('html')).width.replace('px', '')) < 624) {
        document.getElementById('chat-panel').classList.add('hidden');
        document.getElementById('chat-zone').classList.remove('hidden');
    }
    if (chatUsertag.textContent == usertag) return;
    const element = Array.from(document.querySelectorAll('.chatlist-usertag'))
        .find(el => el.textContent.trim() == chatUsertag.textContent);
    if (element)
        element.parentElement.style.backgroundColor = 'rgba(20, 20, 20, 0.8)';
    fetch('/Data/GetUserFromDatabase?usertag=' + usertag)
        .then(response => response.json())
        .then(user => {
            user = JSON.parse(user)[0];
            chatName.textContent = user['Username'];
            chatUserID.textContent = user['UserID'];
            chatUsertag.textContent = user['Usertag'];
            // chatAvatar.src = user['Avatar'];
            document.getElementById('chat-zone').removeAttribute("style");
            document.getElementById('welcome-block').style.display = "none";
            if (user['IsOnline'] == false)
                chatStatus.textContent = setTimeStatus(user['ExpiresAt']);
            else if (user['IsOnline'] == true)
                chatStatus.textContent = "Online";
            else
                chatStatus.textContent = "";
            setChatMessages(chatId);
            fetch(`/Messanger/SetMessagesStatus?changePersonUsertag=${user['Usertag']}&chatId=${chatId}&status=2`);
            const element = Array.from(document.querySelectorAll('.chatlist-usertag'))
                .find(el => el.textContent.trim() == usertag);
            if (element) {
                const parentElement = element.parentElement;
                parentElement.style.backgroundColor = 'rgba(47, 29, 76, 0.8)';
                const unreadIcon = parentElement.querySelector('.unread-icon');
                unreadIcon.style.display = 'none';
                unreadIcon.textContent = '';
            }
            document.getElementById('message-input').focus();
        });
}

function setChatMessages(chatId) {
    const currentChatUsertag = document.getElementById('chat-usertag').innerText;
    const senderUsertag = document.getElementById('current-usertag').textContent;
    const chatMessages = document.getElementById('chat-messages');
    const chatUserID = document.getElementById('chat-userID').innerText;
    if (chatId == -1) {
        chatMessages.innerHTML = '';
        return;
    }
    clearMessages();
    fetch('/Data/GetMessages?chatId=' + chatId)
        .then(response => response.json())
        .then(messages => {
            messages = JSON.parse(messages);
            for (const i in messages) {
                const message = messages[i];
                var messageClass = '';
                var messageIcon = '';
                if (message['SenderID'] == chatUserID) {
                    messageClass = 'friend-message';
                    try {
                        hubConnection.invoke('SetMessegeRead', senderUsertag, currentChatUsertag, message['MessageID']);
                    } catch (err) {
                        catchError(err);
                    }

                }
                else {
                    messageClass = 'user-message';
                    if (message['Status'] == 0)
                        messageIcon = '<img src="/imgs/Sent.png" alt="0" class="status-icon">';
                    else if (message['Status'] == 1)
                        messageIcon = '<img src="/imgs/Received.png" alt="1" class="status-icon">';
                    else if (message['Status'] == 2)
                        messageIcon = '<img src="/imgs/Read.png" alt="2" class="status-icon">';
                }
                const messageItem = `
                <div class="chat-message ${messageClass}">
            <p class="message-id" style="display: none;">${message['MessageID']}</p>
                <p class="message-text">${message['Content'].replace(/\n/g, '<br>').replace('\'\'', '\'')}</p>
                <div class="message-info">
                <span class="message-time">${String(message['Timestamp']).slice(-8, -3)}</span>
                        <span class="message-status">
                        ${messageIcon}
                        </span>
                        </div>
                        `;
                const div = document.createElement('div');
                div.innerHTML = messageItem;
                chatMessages.appendChild(div);
            }
            chatMessages.scrollTo(0, chatMessages.scrollHeight);
        });
}

function clearMessages() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
}

function sendMessage() {
    const sendButton = document.getElementById('send-button');
    const chatList = document.getElementById('chat-list');
    const chatMessages = document.getElementById('chat-messages');
    const senderUsertag = document.getElementById('current-usertag').innerText;
    const getterUsertag = document.getElementById('chat-usertag').innerText;
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value.trim();
    if (messageText.length == 0) {
        return;
    }

    sendButton.setAttribute('disabled', 'disabled');
    messageInput.value = '';
    fetch(`/Messanger/SendMsg`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            SenderUsertag: senderUsertag,
            GetterUsertag: getterUsertag,
            Message: messageText
        })
    })

        .then(response => response.json())
        .then(res => {
            fetch("/Data/GetNextMsgId")
                .then(response => response.json())
                .then(msgID => {
                    msgID = parseInt(msgID, 10) - 1;
                    try {
                        hubConnection.invoke('SendMsg', senderUsertag, getterUsertag, messageText, msgID);
                    } catch (e) {
                        catchError(e);
                    }
                    const messageItem = `
                    <div class="chat-message user-message">
                        <p class="message-id" style="display: none;">${msgID}</p>
                    <p class="message-text">${messageText.trim().replace(/\n/g, '<br>')}</p>
                    <div class="message-info">
                    <span class="message-time">${res['Time']}</span>
                    <span class="message-status">
                    <img src="/imgs/Sent.png" alt="Delivered" class="status-icon">
                    </span>
                    </div>
                    </div>
                    `;

                    const div = document.createElement('div');
                    div.innerHTML = messageItem;
                    chatMessages.appendChild(div);
                    const element = Array.from(document.querySelectorAll('.chatlist-usertag'))
                        .find(el => el.textContent.trim() == getterUsertag);
                    if (element) {
                        const parentElement = element.parentElement;
                        if (messageText.includes('\n'))
                            parentElement.querySelector('.chat-last-message').textContent = messageText.slice(0, messageText.indexOf('\n') + 1) + '...';
                        else
                            parentElement.querySelector('.chat-last-message').textContent = messageText;
                        parentElement.querySelector('.chat-time').textContent = res['Time'];
                        const statusIcon = parentElement.querySelector('.chat-status');

                        if (statusIcon && statusIcon.innerHTML != '<img src="/imgs/Read.png" alt="2" class="status-icon">') {
                            statusIcon.style.display = 'block';
                            statusIcon.innerHTML = `<img src="/imgs/Sent.png" alt="0" class="status-icon">`;

                        }
                        document.getElementById('chat-list').prepend(parentElement.parentElement);
                    }
                    sendButton.removeAttribute('disabled');
                    chatMessages.scrollTo(0, chatMessages.scrollHeight);
                    if (document.getElementById('chat-search-list').style.display == 'block' && !Array.from(chatList.querySelectorAll('.chatlist-usertag')).find(el => el.textContent == getterUsertag)) {
                        toggleSearch(false);
                        fetch(`/Data/GetChat?senderUsertag=${senderUsertag}&getterUsertag=${getterUsertag}`)
                            .then(response => response.json())
                            .then(data => {
                                globalChatList[getterUsertag] = data;

                                globalChatList[getterUsertag]["LastMsgID"] = msgID;
                                const timeString = new Intl.DateTimeFormat('ru-RU', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }).format(new Date());
                                data = JSON.parse(data);
                                const chatItem = `
                            <div class="chat-item">
                            <p class="chatlist-usertag" style="display: none;">${getterUsertag}</p>
                            <p class="chat-id" style="display: none;">${data[0]['ChatID']}</p>
                            <img src="" alt="" class="chat-avatar">
                            <div class="chat-details">
                            <div class="chat-item-header">
                            <h3 class="chat-name">${data[0]["Username"]}</h3>
                                </div>
                                <div class="chat-preview">
                                    <span class="chat-status">
                                    <img src="/imgs/Sent.png" alt="0" class="status-icon">
                                    </span>
                                    <p class="chat-last-message">${messageText}</p>
                                    </div>
                                <div class="chat-time">${timeString}</div>
                                </div>
                                <div class="chat-notification">
                                <span class="unread-icon" style="display: none;"></span>
                                </div>
                        </div>
                    `;
                                const div = document.createElement('div');
                                div.innerHTML = chatItem;
                                chatList.appendChild(div);
                                chatList.prepend(div);
                                div.querySelector('.chat-item').style.backgroundColor = 'rgba(47, 29, 76, 0.8)';
                                document.getElementById('search-input').value = '';
                                setClickEvents(getterUsertag)
                            });
                    }
                    else if (document.getElementById('chat-search-list').style.display === 'block') {
                        toggleSearch(false);
                    }
                    document.getElementById('message-input').focus();

                });
        });
}

function receiveMessage(sender, message) {
    const currentChatUsertag = document.getElementById('chat-usertag').innerText;
    const senderUsertag = document.getElementById('current-usertag').innerText;
    const chatMessages = document.getElementById('chat-messages');
    const chatList = document.getElementById('chat-list');
    const messageId = message.split(' ')[0];
    const messageText = message.slice(messageId.length, -6);
    const messageTime = message.slice(-6);
    globalChatList[sender]["LastMsgID"] = Number(messageId);
    if (sender == currentChatUsertag) {
        const messageItem = `
        <div class="chat-message friend-message">
            <p class="message-id" style="display: none;">${messageId}</p>
            <p class="message-text">${messageText.trim().replace(/\n/g, '<br>')}</p>
            <div class="message-info">
                <span class="message-time">${messageTime}</span>
                <span class="message-status">
                </span>
            </div>
        </div>
        `;

        chatMessages.innerHTML += messageItem;
        const element = Array.from(document.querySelectorAll('.chatlist-usertag'))
            .find(el => el.textContent.trim() == sender);
        if (element) {
            const parentElement = element.parentElement;
            if (messageText.includes('\n'))
                parentElement.querySelector('.chat-last-message').textContent = messageText.slice(0, messageText.indexOf('\n') + 1) + '...';
            else
                parentElement.querySelector('.chat-last-message').textContent = messageText;
            parentElement.querySelector('.chat-time').textContent = messageTime;
            parentElement.querySelector('.chat-status').innerHTML = '';
            parentElement.querySelector('.chat-status').style.display = 'none';
            if (!isOnFocus) {
                const unreadIcon = parentElement.querySelector('.unread-icon');
                if (unreadIcon.textContent == '') {
                    unreadIcon.textContent = '1';
                    unreadIcon.style.display = 'block';
                }
                else {
                    unreadIcon.textContent = parseInt(unreadIcon.textContent, 10) + 1;
                }
                spawnNotification(messageText, sender);
            }
            document.getElementById('chat-list').prepend(parentElement.parentElement);
        }
        chatMessages.scrollTo(0, chatMessages.scrollHeight);

        if (isOnFocus) {
            try {
                hubConnection.invoke('SetMessegeRead', senderUsertag, currentChatUsertag, parseInt(messageId.trim(), 10));
            } catch (e) {
                catchError(e);
            }
        }
    }

    else {
        const chatItems = Array.from(document.querySelectorAll('.chatlist-usertag'))
            .find(el => el.textContent.trim() == sender);
        var chatItem = null;
        if (chatItems)
            chatItem = chatItems.parentElement;
        if (chatItem) {
            if (messageText.includes('\n'))
                chatItem.querySelector('.chat-last-message').textContent = messageText.slice(0, messageText.indexOf('\n') + 1) + '...';
            else
                chatItem.querySelector('.chat-last-message').textContent = messageText;
            chatItem.querySelector('.chat-time').textContent = messageTime;
            chatItem.querySelector('.chat-status').style.display = 'none';
            const unreadIcon = chatItem.querySelector('.unread-icon');
            if (unreadIcon.textContent == '') {
                unreadIcon.textContent = '1';
                unreadIcon.style.display = 'block';
            }
            else {
                unreadIcon.textContent = parseInt(unreadIcon.textContent, 10) + 1;
            }
            document.getElementById('chat-list').prepend(chatItem.parentElement);
            spawnNotification(messageText, sender);
        }
        else {
            fetch(`/Data/GetChat?senderUsertag=${senderUsertag}&getterUsertag=${sender}`)
                .then(response => response.json())
                .then(data => {
                    data = JSON.parse(data);
                    const chatItem = `
                        <div class="chat-item">
                            <p class="chatlist-usertag" style="display: none;">${sender}</p>
                            <p class="chat-id" style="display: none;">${data[0]['ChatID']}</p>
                            <img src="" alt="" class="chat-avatar">
                            <div class="chat-details">
                                <div class="chat-item-header">
                                    <h3 class="chat-name">${data[0]["Username"]}</h3>
                                </div>
                                <div class="chat-preview">
                                    <span class="chat-status"></span>
                                    <p class="chat-last-message">${messageText}</p>
                                </div>
                                <div class="chat-time">${messageTime}</div>
                            </div>
                            <div class="chat-notification">
                                <span class="unread-icon">1</span>
                            </div>
                        </div>
                    `;
                    const div = document.createElement('div');
                    div.innerHTML = chatItem;
                    chatList.appendChild(div);
                    chatList.prepend(div);
                    setClickEvents(sender);
                    spawnNotification(messageText, sender);
                });
        }
    }
}


function setClickEvents(usertag) {
    const chatItem = Array.from(document.querySelectorAll('.chatlist-usertag')).find(el => el.textContent == usertag).parentElement;

    if (chatItem) {
        chatItem.parentElement.addEventListener('click', () => openChat(usertag, chatItem.querySelector('.chat-id').textContent));
    }

}

function markAsRead(getterUsertag, msgID) {
    const currentChatUsertag = document.getElementById('chat-usertag').innerText;
    if (currentChatUsertag == getterUsertag) {
        const msg = Array.from(document.querySelectorAll('.message-id')).find(el => el.textContent == msgID);

        if (msg) {
            msg.parentNode.querySelector('.message-status').innerHTML = `
            <img src="/imgs/Read.png" alt="2" class="status-icon">`;
        }
        const element = Array.from(document.querySelectorAll('.chatlist-usertag'))
            .find(el => el.textContent.trim() == currentChatUsertag);
        if (element) {
            const statusIcon = element.parentElement.querySelector('.chat-status');
            if (statusIcon && statusIcon.style.display != 'none') {
                statusIcon.style.display = 'block';
                statusIcon.innerHTML = `
                <img src="/imgs/Read.png" alt="2" class="status-icon">`;
            }
        }
        fetch(`/Messanger/SetMessageStatus?msgId=${msgID}&status=2`);
    }
    else {
        const chatItem = Array.from(document.querySelectorAll('.chatlist-usertag'))
            .find(el => el.textContent.trim() == getterUsertag).parentElement;
        if (chatItem) {
            const statusIcon = chatItem.querySelector('.chat-status');
            if (statusIcon && statusIcon.style.display != 'none') {
                statusIcon.style.display = 'block';
                statusIcon.innerHTML = `
                <img src="/imgs/Read.png" alt="2" class="status-icon">`;
            }
        }
        fetch(`/Messanger/SetMessageStatus?msgId=${msgID}&status=2`);
    }
}


function setTimeStatus(datetime) {
    var timeString = datetime.toString();
    var date = timeString.split('T')[0];
    var dates = date.split('-');
    var time = timeString.split('T')[1];
    var nowDate = new Date();
    var msg = 'Last seen ';
    var deltaDays = nowDate.getDate() - Number(dates[2]);
    var deltaYears = nowDate.getFullYear() - Number(dates[0]);
    if (deltaDays == 0 && deltaYears == 0)
        msg += `today`;
    else if (deltaDays == 1 && deltaYears == 0)
        msg += 'yesterday';
    else if (deltaDays > 1 && deltaYears == 0)
        msg += `${dates[1]}.${dates[2]}`;
    else if (deltaYears > 0)
        msg += `${dates[0]}.${dates[1]}.${dates[2]}`;

    msg += ' at ' + time.slice(0, -3);
    return msg;
}

function setAllNewMsgsRead() {
    const currentChatUsertag = document.getElementById('chat-usertag').innerText;
    const senderUsertag = document.getElementById('current-usertag').innerText;
    if (currentChatUsertag == '') return;
    const chatItem = Array.from(document.querySelectorAll('.chatlist-usertag'))
        .find(el => el.textContent.trim() == currentChatUsertag).parentElement;
    const unreadElem = chatItem.querySelector('.unread-icon');
    if (unreadElem.textContent == '') return;
    var unreadMsgsCount = Number(unreadElem.textContent);
    var messageItems = document.querySelectorAll('.friend-message');
    for (var i = messageItems.length - 1; i >= 0; i--) {
        if (unreadMsgsCount <= 0) break;

        try {
            hubConnection.invoke('SetMessegeRead', senderUsertag, currentChatUsertag, parseInt(messageItems[i].querySelector('.message-id').textContent, 10));
        } catch (e) {
            catchError(e);
        }
        unreadMsgsCount--;
    }
    unreadElem.style.display = 'none';
    unreadElem.textContent = '';

}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function spawnNotification(body, title) {
    var options = {
        body: body,
        icon: "/imgs/ImpulseIcon.png",
    };
    var notification = new Notification(title, options);
}