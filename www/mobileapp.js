"use strict";

if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
}


function SignPage() {

    var args = location.hash.substr(1).split(',');
    var lang = args[0];
    var host = args[1];
    var c = args[2];
    var password_input = document.getElementById("password_input");
    var password_form = document.getElementById("password_form");
    var accept_button = document.getElementById("accept_button");
    var create_button= document.getElementById("create_button");
    var always_blank= document.getElementById("always_blank");
    var always_blank_label= document.getElementById("keep_password_blank");
    var spinner = document.getElementById("spinner");

    var keystore = localStorage["secretKey"] ? JSON.parse(localStorage["secretKey"]) : {}

    function updateLang() {
        langSetText(document.getElementById("enter_password"), "enter_password");
        langSetText(document.getElementById("keep_password_blank"), "always_blank");
        langSetText(document.getElementById("accept_button"), "accept_button");
        langSetText(document.getElementById("create_button"), "create_button");
    }

    function init() {
        loadLang(lang, updateLang);
        var serviceId = document.getElementById("serviceId");
        serviceId.appendChild(document.createTextNode(host));

        if (keystore[host]) {

            var keyinfo = keystore[host];
            if (keyinfo.hasPwd) {
                password_form.style.display = "block";
                accept_button.style.display = "block";
            } else {
                setTimeout(signAndPushRequest, 1);
            }
        } else {
            password_form.style.display = "block";
            create_button.style.display = "block";
        }
        accept_button.addEventListener("click",signAndPushRequest);
        create_button.addEventListener("click",createKey);
        password_input.addEventListener("input", function() {
            var v = password_input.value.length  != 0;
            always_blank.disabled = v;   
            if (v) always_blank.checked = false;
        })
    }

    function signAndPushRequest() {
        password_form.style.display = "none";
        create_button.style.display = "none";
        accept_button.style.display = "none";
        spinner.style.display = "block";
        setTimeout(signAndPushRequest2, 10);
    }

    function saveKeys() {
        localStorage["secretKey"] = JSON.stringify(keystore);
    }

    function combineKeyAndPin(key, pin) {
        var keypin = key + pin;
        return Crypto.SHA256(keypin, { asBytes: true });
    }

    function signRequest(c, key) {
        return sign_message(new Bitcoin.ECKey(key), c, false);
    }


    function signAndPushRequest2() {

        var keyinfo = keystore[host];
        var key;

        if (keyinfo.hasPwd) {
            var removepwd = always_blank.checked;
            if (removepwd) {
                keyinfo.hasPwd = false;
                saveKeys();
                key = combineKeyAndPin(keyinfo.secret);
            } else {
                var pin = password_input.value;
                key = combineKeyAndPin(keyinfo.secret, pin);
            }
        } else {
            key = combineKeyAndPin(keyinfo.secret);
        }


        var timestamp = Math.floor(Date.now() / 1000);
        var msg = "login to " + host + ", challenge is " + c + ", timestamp " + timestamp;
        var signature = signRequest(msg, key);
        location.href = "r?c=" + c + "&r=" + encodeURIComponent(signature) + "&t=" + timestamp + "#" + lang;

    }
    function createKey() {

        spinner.style.display = "block";
        create_button.style.display = "none";
        setTimeout(createKey2, 10);
    }

    function createKey2() {

        var bytes = secureRandom(32);
        keystore[host] = {
            secret: Crypto.util.bytesToHex(bytes) + c,
            hasPwd: !always_blank.checked
        }
        saveKeys();
        signAndPushRequest();
    }

    init();

}


function startSign() {
    window.signPage = new SignPage();

}