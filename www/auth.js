function QRloginAuth(argss, lang, controls  /* = qr,download,restore,header*/) {
	
//	var qrcodeBox = document.getElementById("qrcode");
	var curcode = null;
	var challengeUrl = null;
	var useEventSource = false;
	var connection = null;
	var eventSource = null;
	var curmode = null;
	var channelid = null;
	var restpanel = false;
	var downloadshown = false;
	var args = argss;
	var issign = args.signmsg || args.signhash;
	var closeIFrameButt = function () { };
	var me = this;

	var qrcodeBox = controls["qr"];
	var restoreBox = controls["restore"];
	var downloadBox = controls["download"];

	var qrcode = new QRCode(qrcodeBox, {
	    useSVG: true, correctLevel: 0
	  });

	var fileinput = restoreBox.getElementsByTagName("input")[0];
	var restoreBackup = null;
	var processRespone = null;
	var showDownloadBox = null;

	function base64EncodeUrl(str){
	    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
	}


	function getDomainFromUrl(url) {
		var parts = url.split('/');
		//proto: / <empty> / <auth>@<domain>:<port> / path....
		
		var authdomain = parts[2].split('@');
		var domain = authdomain[authdomain.length-1];
		
		return domain;
		
	} 
	
	var apikey = null;
	
	var reload = function (mode) {
	    curmode = mode;
	    if (mode == QRloginAuth.modeRestore) return restoreBackup();
	    var manage = mode == QRloginAuth.modeManage;
	    apikey = getDomainFromUrl(args.redirect_uri);
	    restoreBox.hide(); restpanel = false;
	    downloadBox.hide(); downloadshown = false;
	    closeIFrameButt();
	    qrcodeBox.style.visibility = "visible";

	    var bytes = secureRandom(20);
	    curcode = base64EncodeUrl(QRlogin.bytesToBase64(bytes));
	    channelid = Crypto.SHA256(curcode);;
	    var logurl = "l?c=" + channelid;

	    if (window.EventSource) {
	        if (eventSource != null) eventSource.close();
	        eventSource = new EventSource(logurl);
	        eventSource.addEventListener("message", function(event) {
	            var response = event.data;
	            processResponse(response);
	            eventSource.close();
	        } .bind(this));
	        eventSource.addEventListener("error", function(event) {
	            if (eventSource.readyState == 2) {
	                qrcodeBox.style.visibility = "hidden";
	            }
	        } .bind(this))
	    } else {
	        if (connection != null) connection.abort();
	        connection = new XMLHttpRequest();
	        connection.open("GET", logurl, true);
	        connection.onreadystatechange = function(request) {
	            if (connection.readyState == 4) {
	                if (connection.status == 200) {
	                    var response = connection.responseText;
	                    this.processResponse(response);
	                } else if (connection.status == 409) {
	                    this.reload(curmode);
	                }
	            }
	        } .bind(this);
	        connection.send();
	    }


	    if (manage) {
	        challengeUrl = getFullUrl("m#" + lang + "," + apikey + "," + curcode);
	    } else {
	        var sfx = "";
	        var pfx = "";
	        if (args.signmsg) {
	            pfx = "s"; sfx = ",msg=" + QRlogin.encodeURIComponent(args.signmsg);
	        }
	        else if (args.signhash) {
	            pfx = "s"; sfx = ",hash=" + QRlogin.encodeURIComponent(
                    QRlogin.hexToBase64(args.signhash));
	        }
	        else { pfx = "c"; sfx = ""; }

	        challengeUrl = getFullUrl(pfx + "#" + lang + "," + apikey + "," + curcode + sfx);
	    }
	    qrcode.makeCode(challengeUrl)
	}
	

	qrcodeBox.addEventListener("click",function() {	

	    closeIFrameButt();
	    var win = window.open(challengeUrl, "_blank", "width=400,height=600,menubar=no,resizable=yes,status=no,location=no,toolbar=no,directories=no,top=150");
	    closeIFrameButt = function () { if (win) win.close(); win = null;}
	});

    

	showDownloadBox = function() {

	    downloadBox.show();
	    downloadshown = true;
	    var timer = 61;

	    function decTimer() {
	        timer--;
	        if (!downloadshown) return;
	        if (timer == 0) {
	            reload(curmode);
	        } else {

	            var e = downloadBox.getElementsByTagName("span")[0];
	            e.removeChild(e.firstChild);
	            e.appendChild(document.createTextNode(timer));
	            setTimeout(bindDecTimer, 1000);
	        }
	    }
	    var bindDecTimer =  decTimer.bind(this);

	    setTimeout(bindDecTimer, 1);
	}

	function printKey() {
	    window.open("print.html#" + lang + "," + apikey + "," + channelid);
	    reload(curmode);
	}

	function downloadKey() {
	    location.href = "backup?c="+channelid;
	    reload(curmode);
	}


	processResponse = function(response) {
	    var r = response.trim();
	    if (r == "") {
	        reload(curmode);
	        return;
	    }

	    var redir;
	    if (r.substr(0, 7) == "backup:") {

	        showDownloadBox();

	    } else {
	        redir = args.redirect_uri;
	        if (args.js) {
	            redir = redir + "#?";
	        } else {
	            var qmark = redir.indexOf('?');
	            if (qmark == -1) redir = redir + "?"; else redir = redir + '&';
	        }
	        var adjr;
	        if (args.signhash) adjr = r;
	        else if (args.signmsg) {
	            adjr = r
	        } else {
	            adjr = r + ":" + curcode;
	        }
	        redir = redir + "code=" + encodeURIComponent(adjr);
	        if (args.scope) redir = redir + "&scope=" + encodeURIComponent(args.scope);
	        if (args.state) redir = redir + "&state=" + encodeURIComponent(args.state);
	        window.top.location = redir;
	    }

	}

	this.setLang = function(l) {
	    lang = l;
	    if (!restpanel && !downloadshown) reload(curmode);
	    else if (restpanel) restoreBox.show();
	}

	this.setNewArgs = function(argss) {
	    args = argss;
	}

	this.reload = function (args) {
	    reload(args);
	}

	restoreBackup = function() {
	    var target = qrcodeBox.parentElement;
	    target.style.position = "relative";
	    target.appendChild(restoreBox);
	    closeIFrameButt();
	    restoreBox.show();
	    fileinput.classList.remove("error");
	    restpanel = true;
	    downloadBox.hide(); downloadshown = false;


	}

	var init = function() {

	    fileinput.addEventListener("change", uploadFile.bind(this, fileinput));
	    var buttons = downloadBox.getElementsByTagName("button");
	    buttons[0].addEventListener("click", downloadKey.bind(this));
	    buttons[1].addEventListener("click", printKey.bind(this));

	}

	var uploadFile = function(fileinput) {
	    window.browsedFile = fileinput;
	    var files = fileinput.files;
	    if (files.length == 1) {
	        var f = files[0];
	        if (f.size > 150) {
	            fileinput.classList.add("error");
	        } else {
	            var r = new FileReader();
	            r.onload = function(e) {
	                var contents = base64_encodeURIComponent(e.target.result);
	                challengeUrl = getFullUrl("k#" + lang + "," + apikey + "," + contents);
	                qrcode.makeCode(challengeUrl);
	                qrcodeBox.style.visibility = "visible";
	                restoreBox.hide();
	            }
	            r.readAsText(f);
	        }
	    }
	}
	init.call(this);
}
QRloginAuth.prototype.modeLogin = 0;
QRloginAuth.prototype.modeManage = 1;
QRloginAuth.prototype.modeRestore = 2;




function LangPanel(panel,curlang, QRloginAuth) {
    var lang = curlang;
    var langlist = ["cs","en"];
    var i;
    var lpanel = panel;
    
    
    function drawPanel() {
        while(lpanel.firstChild) {
            lpanel.removeChild(panel.firstChild);
        }
        
        for (i = 0; i < langlist.length;i++) {
            if (langlist[i] == lang) continue;
            var img = document.createElement("img");
            
            img.src = "img/lang_"+langlist[i]+".gif";
            img.onclick = function(l) {
                QRloginAuth.setLang(l);
                lang = l;
                drawPanel();
                loadLang(lang);
                localStorage["default_lang"] = lang;
            } .bind(this, langlist[i]);
            lpanel.appendChild(img);
            
        }
    }
    this.setLang = function(l) {
        lang = l;
        drawPanel();        
        localStorage["default_lang"] = lang;
    }    

    drawPanel();
}

var Selector = function (panels) {



    this.select = function (v1) {
        for (var i = 0; i < panels.length; i++) {
            if (i == v1) panels[i].element.classList.add("hl");
            else panels[i].element.classList.remove("hl");
        }
    }
    for (var i = 0; i < panels.length; i++) {
        var action = panels[i].action;
        var fn = function (v, action) {
            this.select(v);
            action();
        }.bind(this, i, action);
        panels[i].element.addEventListener("click", fn);
    }
    this.setVisibility = function (v, visible) {
        if (visible) panels[v].element.style.display = "table-cell";
        else panels[v].element.style.display = "none";
    }

};

function initObjects() {
    var querystr = location.hash.substr(0, 2) == "#?" ? getQueryString(location.hash.substr(1)) : getQueryString(location.search);
    var lang = querystr["lang"];
    if (!lang) {
        if (localStorage) lang = localStorage["default_lang"];
        if (!lang)
            lang = "en";
    }
    loadLang(lang);

    var qrblock = getBlockById("qrblock");
    var panel = getBlockById("langpanel");
    var restoreBox = getBlockById("restoreform");
    var downloadBox = getBlockById("downloadask");

    window.QRloginAuth = new QRloginAuth(querystr, lang,
			{ qr: qrblock, restore: restoreBox, download: downloadBox });
    window.QRloginAuth.reload(false);

    window.langpanel = new LangPanel(panel, lang, QRloginAuth);    

    window.selector = new Selector([
        {element:getBlockById("tab_login"),action:function () { QRloginAuth.reload(QRloginAuth.modeLogin); }},
        { element: getBlockById("tab_manage"), action: function () { QRloginAuth.reload(QRloginAuth.modeManage); } },
        { element: getBlockById("tab_restore"), action: function () { QRloginAuth.reload(QRloginAuth.modeRestore); } }
        ]);
    if (querystr["signmsg"] || querystr["signhash"]) {
        getBlockById("tab_login").classList.add("str_auth_sign");
    } else {
        getBlockById("tab_login").classList.add("str_auth_login");
    }
    window.selector.select(0);

}




function start() {
    initObjects();	    
}

window.addEventListener("hashchange", function () {
    if (location.hash.substr(0, 2) == "#?") {
        var querystr = location.hash.substr(0, 2) == "#?"
            ? getQueryString(location.hash.substr(1), QRlogin.decodeURIMessage)
            : getQueryString(location.search, QRlogin.decodeURIMessage);
        var lang = querystr["lang"];
        if (lang) {
            window.langpanel.setLang(lang);
            loadLang(lang);
        }
        window.QRloginAuth.setNewArgs(querystr);
        window.QRloginAuth.reload(false);
        window.selector.select(0);
    }
});