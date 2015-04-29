"use strict";

if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
}


function fromOldFormat(domain) {
    //transfer keys from old version
    var keystore = localStorage["secretKey"] ? JSON.parse(localStorage["secretKey"]) : {}
    if (keystore[domain]) {
        var key = keystore[domain];
        key.prehash = Crypto.SHA256(key.secret, { asBytes: true });
        setKey(domain, key);
        delete keystore[domain];
        localStorage["secretKey"] = JSON.stringify(keystore);
        return key;
    }
}

function getKey(domain) {

    var kstr = localStorage["keyStorage_" + domain];
    if (kstr) {
        return JSON.parse(kstr);
    } else {

        return false;
    }
}

function setKey(domain, keyinfo) {
    localStorage["keyStorage_" + domain] = JSON.stringify(keyinfo);
}

function eraseKey(domain) {
    delete localStorage["keyStorage_" + domain];

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
    var delivered_sect = document.getElementById("delivered_sect");
    var failed_sect = document.getElementById("failed_sect");



    function updateLang() {
        langSetTextId("enter_password");
        langSetTextId("keep_password_blank", "always_blank");
        langSetTextId("accept_button");
        langSetTextId("create_button");
        langSetTextId("delivered");
        langSetTextId("failed");
    }

    function showPwd(create) {
        password_form.style.display = "block";
        if (create)
            create_button.style.display = "block";
        else
            accept_button.style.display = "block";
        password_input.focus();
        if (password_input.prompt) password_input.prompt();
        else password_input.click();
  
    }

    function init() {
        loadLang(lang, updateLang);
        var serviceId = document.getElementById("serviceId");
        serviceId.appendChild(document.createTextNode(host));

        //import keys if necesery
        fromOldFormat(host);
        //get key
        var keyinfo = getKey(host);

        //key exist?
        if (keyinfo) {

            if (keyinfo.hasPwd) {
                showPwd(false);
            } else {
                setTimeout(signAndPushRequest, 1);
            }
        } else {
            showPwd(true);
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

    function combineKeyAndPin(key, pin) {
        var keypin = key + pin;
        return Crypto.SHA256(keypin, { asBytes: true });
    }

    function signRequest(c, key) {
        return sign_message(new Bitcoin.ECKey(key), c, false);
    }


    function signAndPushRequest2() {

        var keyinfo = getKey(host);
        var key;

        if (keyinfo.hasPwd) {
            var removepwd = always_blank.checked;
            if (removepwd) {
                keyinfo.hasPwd = false;
                setKey(host, keyinfo)
                key = keyinfo.prehash;
            } else {
                var pin = password_input.value;
                if (pin == "") key = keyinfo.prehash;
                else key = combineKeyAndPin(keyinfo.secret, pin);
            }
        } else {
            key = keyinfo.prehash;
        }


        var timestamp = Math.floor(Date.now() / 1000);
        var msg = "login to " + host + ", challenge is " + c + ", timestamp " + timestamp;
        var signature = signRequest(msg, key);
        //if failed
        if (signature === false) {
            //schedule new try
            setTimeout(signAndPushRequest2, 1);
            return;
        }
        var url = "r?c=" + c + "&r=" + encodeURIComponent(signature) + "&t=" + timestamp + "&q=1";
        var connection = new XMLHttpRequest();	
		connection.open("GET",url,true);
		connection.onreadystatechange = function(request) {
            if (connection.readyState == 4 ) {
            	spinner.style.display="none";
                if (connection.status == 200) {
                	delivered_sect.style.display="block";
                } else {
                	failed_sect.style.display="block";
                }
            }
		}
		connection.send();

    }
    function createKey() {

        spinner.style.display = "block";
        create_button.style.display = "none";
        setTimeout(createKey2, 10);
    }

    function createKey2() {

        var bytes = secureRandom(32);
        var secret = Crypto.util.bytesToHex(bytes) + c; 
        var keyinfo  = {
            secret: secret,
            hasPwd: !always_blank.checked,
            prehash: Crypto.SHA256(secret, { asBytes: true })
        };
                
        setKey(host,keyinfo);
        signAndPushRequest();
    }

    init();

}


function startSign() {
    window.signPage = new SignPage;

}

function OKPage() {
    var lang = window.location.hash.substr(1);

    function updateLang() {
        langSetTextId("delivered");
    }

    function init() {
        loadLang(lang, updateLang);
    }

    init();    
   

}

function startOKPage() {

    window.okPage = new OKPage;



}

function FailPage() {
    var lang = window.location.hash.substr(1);

    function updateLang() {
        langSetTextId("failed");
    }

    function init() {
        loadLang(lang, updateLang);
    }

    init();


}

function startFailPage() {

    window.okPage = new FailPage;

}


function ManagePage() {
    var args = location.hash.substr(1).split(',');
    var lang = args[0];
    var host = args[1];
    var c = args[2];
    
    function updateLang() {
        langSetTextId("backup_button");
        langSetTextId("enablepwd_button");
        langSetTextId("erase_button");
        langSetTextId("done_text");
        langSetTextId("erase_ask_label");
        langSetTextId("erase_yes");
        langSetTextId("erase_no");
        langSetTextId("noprofile");
        
    }

    var backup_button = document.getElementById("backup_button");
    var enable_pwd_button = document.getElementById("enablepwd_button");
    var erase_key_button = document.getElementById("erase_button");
    var erase_key_yes = document.getElementById("erase_yes");
    var erase_key_no =  document.getElementById("erase_no");
    var panel =  document.getElementById("panel");
    var noprofile =  document.getElementById("noprofile");
    var eraseask =  document.getElementById("eraseask");
    var done_sect = document.getElementById("done_sect");
    var failed_sect = document.getElementById("failed_sect");
    var passphrase_panel = document.getElementById("passphrase_panel");
    var backup_key_button= document.getElementById("backup_key_button");
    var cancel_button = document.getElementById("cancel_button");
    var passphrase = document.getElementById("passphrase");
    var progressbar = document.getElementById("progressbar");

    function extendKey(pwd,progress,cb) {        
        var cycles = 65535 / pwd.length;
     

        var last = Crypto.util.hexToBytes("0000000000000000000000000000000000000000000000000000000000000000");
        var c = 0;

        var run1000 = function() {

            var stop = c + 500;
            if (stop > cycles) stop = cycles;
            while (c < stop) {
                var hasher = new jsSHA(Crypto.util.bytesToHex(last), 'HEX');
                last = Crypto.util.hexToBytes(hasher.getHMAC(pwd, "TEXT", "SHA-256", "HEX"));
                c++;
            }
            progress.style.width=(c/cycles * 100)+"%";
            if (c >= cycles) {
                cb(last);
            } else {
                setTimeout(run1000, 10);
            }
        }

        setTimeout(run1000, 100);
    }
    
    function init() {
        var serviceId = document.getElementById("serviceId");
        serviceId.appendChild(document.createTextNode(host));
        loadLang(lang, updateLang);
        
        if (!getKey(host)) {
        	noprofile.style.display="block";        	        	
        } else {
        	panel.style.display="block";
	        
	        erase_key_yes.addEventListener("click", function() {
	        	eraseask.style.display="none";
	        	eraseKey(host);
	        	done_sect.style.display="block";        	
	        });
	        erase_key_no.addEventListener("click", function() {
	        	eraseask.style.display="none";
	        	panel.style.display="block";        	        	
	        });
	        cancel_button.addEventListener("click", function() {
	            passphrase_panel.style.display = "none";
	            panel.style.display = "block";
	        });
	        erase_key_button.addEventListener("click", function() {
	        	panel.style.display="none";        	        	
	        	eraseask.style.display="block";
	        });
	        enable_pwd_button.addEventListener("click", function() {
	        	
	        	var key = getKey(host);
	        	key.hasPwd = true;
	        	setKey(host,key);
	        	panel.style.display="none";
	        	done_sect.style.display="block";        	
	        	
	        });
	        backup_button.addEventListener("click", function() {

	            passphrase_panel.style.display = "block";
	            panel.style.display = "none";
	            passphrase.focus();
	            
	        });


	        backup_key_button.addEventListener("click", function() {

	            var pwd = passphrase.value;
	            if (pwd.length < 8) return;

	            passphrase_panel.style.display = "none";
	            progressbar.style.display="block";

	            var key = getKey(host);
	            extendKey(pwd, progressbar.firstChild, function(pwd) {

	            	progressbar.style.display = "none";
		            spinner.style.display = "block";

	                var enckey = GibberishAES.enc(key.secret, pwd);

	                var url = "backup?c=" + c;
	                var connection = new XMLHttpRequest();
	                connection.open("POST", url, true);
	                connection.onreadystatechange = function(request) {
	                    if (connection.readyState == 4) {
	                        spinner.style.display = "none";
	                        if (connection.status == 201) {
	                            done_sect.style.display = "block";
	                        } else {
	                            failed_sect.style.display = "block";
	                        }
	                    }
	                }
	                connection.send(enckey);
	            });
	        });
	        
        }

    }
    
    init();

};	

function startManage() {
	window.managePage = new ManagePage;
}


