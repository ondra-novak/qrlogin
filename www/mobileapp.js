"use strict";

if (!Date.now) {
    Date.now = function() { return new Date().getTime(); }
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
    var password_input = getBlockById("password_input");
    var password_form = getBlockById("password_form");
    var accept_button = getBlockById("accept_button");
    var create_button= getBlockById("create_button");
    var always_blank= getBlockById("always_blank");
    var spinner = getBlockById("spinner");
    var delivered_sect = getBlockById("delivered_sect");
    var failed_sect = getBlockById("failed_sect");
    var chkdomain = getBlockById("checkdomain");

    var attempt = localStorage.attempts ? JSON.parse(localStorage.attempts) : 0;

    function showPwdForm() {
        password_form.show();
        password_input.focus();
        if (password_input.prompt) password_input.prompt();        
    }

    function init() {
        loadLang(lang);
        var serviceId = getBlockById("serviceId");
        serviceId.appendChild(document.createTextNode(host));

        //get key
        var keyinfo = getKey(host);

        //key exist?
        if (keyinfo) {

            if (keyinfo.hasPwd) showPwdForm();            
            setTimeout(accept_button.show.bind(accept_button), 1000);
            if (Math.sqrt(attempt) == Math.floor(Math.sqrt(attempt))) {
                chkdomain.show();
            }
            attempt++;
        } else {
        showPwdForm();
            create_button.show();
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
        password_form.hide();
        create_button.hide();
        accept_button.hide();
        chkdomain.hide();
        spinner.show();
        setTimeout(signAndPushRequest2, 10);
    }

    function combineKeyAndPin(key, pwd) {
        var hashedpwd = Crypto.SHA256(pwd,{ asBytes: true });
        var keypwd = hashedpwd.concat(key);
        return Crypto.SHA256(keypwd, { asBytes: true });
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
		    if (connection.readyState == 4) {
		        spinner.hide();
		        if (connection.status == 200) {
		            delivered_sect.show();
		            localStorage.attempts = JSON.stringify(attempt);
		        } else {
		            failed_sect.show();
		        }
		    }
		}
		connection.send();

    }
    function createKey() {

        spinner.show();
        create_button.hide();
        setTimeout(createKey2, 10);
    }

    function createKey2() {

        var bytes = secureRandom(32);
        var secret = Crypto.util.bytesToHex(bytes) + c;
        secret = Crypto.SHA256(secret, { asBytes: true });
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

function extendKey(pwd, progress, cb) {
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
        progress.style.width = (c / cycles * 100) + "%";
        if (c >= cycles) {
            cb(last);
        } else {
            setTimeout(run1000, 10);
        }
    }

    setTimeout(run1000, 100);
}


function ManagePage() {
    var args = location.hash.substr(1).split(',');
    var lang = args[0];
    var host = args[1];
    var c = args[2];
    

    var backup_button = getBlockById("backup_button");
    var enable_pwd_button = getBlockById("enablepwd_button");
    var erase_key_button = getBlockById("erase_button");
    var erase_key_yes = getBlockById("erase_yes");
    var erase_key_no =  getBlockById("erase_no");
    var panel =  getBlockById("panel");
    var noprofile =  getBlockById("noprofile");
    var eraseask =  getBlockById("eraseask");
    var done_sect = getBlockById("done_sect");
    var failed_sect = getBlockById("failed_sect");
    var passphrase_panel = getBlockById("passphrase_panel");
    var backup_key_button= getBlockById("backup_key_button");
    var cancel_button = getBlockById("cancel_button");
    var passphrase = getBlockById("passphrase");
    var progressbar = getBlockById("progressbar");
    var qrbox = getBlockById("qrbox");
    var spinner = getBlockById("spinner");

    
    function init() {
        var serviceId = getBlockById("serviceId");
        serviceId.appendChild(document.createTextNode(host));
        loadLang(lang);
        var keyinfo =  getKey(host);
        
        if (!keyinfo) {
        	noprofile.show();
         } else {
            if (keyinfo.hasPwd) {
                enable_pwd_button.hide();
            }
        	panel.show();
	        
	        erase_key_yes.addEventListener("click", function() {
	        	eraseask.hide();
	        	eraseKey(host);
	        	done_sect.show();        	
	        });
	        erase_key_no.addEventListener("click", function() {
	        	eraseask.hide();
	        	panel.show();        	        	
	        });
	        cancel_button.addEventListener("click", function() {
	            passphrase_panel.hide();
	            panel.show();
	        });
	        erase_key_button.addEventListener("click", function() {
	        	panel.hide();        	        	
	        	eraseask.show();
	        });
	        enable_pwd_button.addEventListener("click", function() {
	        	
	        	var key = getKey(host);
	        	key.hasPwd = true;
	        	setKey(host,key);
	        	panel.hide();
	        	done_sect.show();        	
	        	
	        });
	        backup_button.addEventListener("click", function() {

	            passphrase_panel.show();
	            panel.hide();
	            passphrase.focus();

	        });

	        backup_key_button.addEventListener("click", function() {

	            var pwd = passphrase.value;
	            if (pwd.length < 8) return;

	            passphrase_panel.hide();
	            progressbar.show();

	            var key = getKey(host);
	            extendKey(pwd, progressbar.firstChild, function(pwd) {

	                progressbar.hide();
	                spinner.show();

	                var wif = new Bitcoin.Address(key.secret);
	                wif.version = 0x80;

	                var keyfile = {
	                    wif: wif.toString(),
	                    hasPwd: key.hasPwd
	                }

	                var enckey = GibberishAES.enc(JSON.stringify(keyfile), pwd);

	                var url = "backup?c=" + c;
	                var connection = new XMLHttpRequest();
	                connection.open("POST", url, true);
	                connection.onreadystatechange = function(request) {
	                    if (connection.readyState == 4) {
	                        spinner.hide();
	                        if (connection.status == 201) {
	                            done_sect.show();
	                        } else {
	                            failed_sect.show();
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

function parseBase58Check(address) {
    var bytes = Bitcoin.Base58.decode(address);
    var end = bytes.length - 4;
    var hash = bytes.slice(0, end);
    var checksum = Crypto.SHA256(Crypto.SHA256(hash, { asBytes: true }), { asBytes: true });
    if (checksum[0] != bytes[end] ||
            checksum[1] != bytes[end + 1] ||
            checksum[2] != bytes[end + 2] ||
            checksum[3] != bytes[end + 3])
        throw new Error("Wrong checksum");
    var version = hash.shift();
    return [version, hash];
}

function startManage() {
	window.managePage = new ManagePage;
}

function RestorePage() {
    var args = location.hash.substr(1).split(',');
    var lang = args[0];
    var host = args[1];
    var c = args[2];


    var alreadyprofile = getBlockById("alreadyprofile");
    var passphrase_panel = getBlockById("passphrase_panel");
    var passphrase = getBlockById("passphrase");
    var restore_key_button = getBlockById("restore_key_button");
    var spinner = getBlockById("spinner");
    var progressbar = getBlockById("progressbar");
    var done_sect = getBlockById("done_sect");
    var encrypted_key = base64_decodeURIComponent(c);

    var init = function() {
        var serviceId = getBlockById("serviceId");
        serviceId.appendChild(document.createTextNode(host));
        loadLang(lang);

        if (getKey(host)) {
            alreadyprofile.show();
        } else {
            passphrase_panel.show();
            restore_key_button.addEventListener("click", importKey);
        }
    }



    var importKey = function() {
        var pwd = passphrase.value;
        if (pwd.length < 8) return;

        passphrase_panel.hide();
        progressbar.show();

        extendKey(pwd, progressbar.firstChild, function(pwd) {

            progressbar.hide();


            try {
                var key = GibberishAES.dec(encrypted_key, pwd);
                if (key) {
                    var keyfile = JSON.parse(key);
                    var secret = parseBase58Check(keyfile.wif)[1];
                    var hasPwd = keyfile.hasPwd;
                    var keyinfo = {
                        secret:secret,
                        hasPwd:hasPwd,
                        prehash:Crypto.SHA256(secret, { asBytes: true })
                    };

                    setKey(host, keyinfo);
                    done_sect.show();
                } else {
                    passphrase_panel.show();
                }
            } catch (e) {
                passphrase_panel.show();
            }

        });

    }

    var loadKey = function(cb) {
        //key is no longer transfered through the network
        cb(c);
    }

    init();
}

function startRestore() {
    window.managePage = new RestorePage();
}
