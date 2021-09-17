var websocket;  

function wsInit(portSocket) {
    
    websocket = new WebSocket("wss://127.0.0.1:" + portSocket + "/TracerService");

    websocket.onopen = function (evt) {
        writeToScreen(evt.type.toUpperCase() + "\n");
    };

    websocket.onclose = function (evt) {
        writeToScreen(evt.type.toUpperCase() + "\n");
    };

    websocket.onmessage = function (evt) {
        writeToScreen("RESPONSE:\n" + evt.data);

        var dataToSend = { file: evt.data, MethodName: "WebSocketSender" };

        var options =
        {
            url: "Shape.aspx",
            async: false,
            data: dataToSend,
            dataType: "text",
            type: "POST",
            complete: function (arg) {
                if (arg.response !== "error") {
                    $("#ShapeImage > img").attr("src", arg.response);
                    HideLog();
                    window.location.href = window.location.href;
                }
            }
        };

        $.ajax(options);
    };

    websocket.onerror = function (evt) {
        writeToScreen(evt.type.toUpperCase() + "\n");
        
    };
}

function wsSend(msg) {
    if (websocket == undefined) return;

    waitForSocketConnection(websocket, function () {
        websocket.send(msg);
        writeToScreen("SENT: " + msg);
    });
}

function wsClose() {
    if (websocket == undefined) return;
    websocket.close();
}

function waitForSocketConnection(socket, callback) {
    setTimeout(function () {
        if (socket.readyState === socket.OPEN) {
            if (callback != null) {
                callback();
            }
            return;
        } else {
            waitForSocketConnection(socket, callback);
        }
    }, 3);
}

function writeToScreen(message) {
    id("MainContent_TextBox14").value += "\r\n" + message;
}

function CreateConnection() {

    var parity = GetParityStringEnum(getIntCookie("SSMCFG2", "Parity"));
    var stoplen = GetStopBitsStringEnum(getIntCookie("SSMCFG2", "Stoplen"));
    var handshake = GetHandshakeStringEnum(getIntCookie("SSMCFG2", "Handshake"));

    var devicePort = navigator.platform === ("MacIntel") ? (getStrCookie("SSMCFG2", "Port") == "99" ? "TCPIP" : getStrCookie("SSMCFG2", "Port")) : getIntCookie("SSMCFG2", "Port");
     
    return {
        'Device': getIntCookie("SSMCFG2", "Port") === 99 ? "1" : "0",

        'Tracer': getStrCookie("SSMCFG2", "Tracer"),

        'Port': devicePort,
        'BaudRate': getIntCookie("SSMCFG2", "Bps"),
        'Parity': parity,
        'DataBits': getIntCookie("SSMCFG2", "Wordlen"),
        'StopBits': stoplen,
        'Handshake': handshake,


        'RemoteHost': getStrCookie("SSMCFG2", "TRCIP"),
        'RemotePort': getStrCookie("SSMCFG2", "TRCPORT")
    };
}
