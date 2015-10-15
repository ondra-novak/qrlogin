function QRLogin(argss, lang, controls  /* = qr,download,restore,header*/) {
	
//	var qrcodeBox = document.getElementById("qrcode");
	var curcode = null;
	var challengeUrl = null;
	var useEventSource = false;
	var connection = null;
	var eventSource = null;
	var curmode = false;
	var restpanel = false;
	var downloadshown = false;
	var args = argss;
	var closeIFrameButt = function () { };

	var qrcodeBox = controls["qr"];
	var restoreBox = controls["restore"];
	var downloadBox = controls["download"];

	var qrcode = new QRCode(qrcodeBox, {
	    useSVG: true, correctLevel: 0
	  });

	var fileinput = restoreBox.getElementsByTagName("input")[0];

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
	
	this.reload = function(manage) {
	    apikey = getDomainFromUrl(args.redirect_uri);
	    curmode = manage;
	    restoreBox.hide(); restpanel = false;
	    downloadBox.hide(); downloadshown = false;
	    closeIFrameButt();
	    qrcodeBox.style.visibility = "visible";

	    var bytes = secureRandom(20);
	    curcode = base64EncodeUrl(Crypto.util.bytesToBase64(bytes));
	    var logurl = "l?c=" + Crypto.SHA256(curcode);

	    if (window.EventSource) {
	        if (eventSource != null) eventSource.close();
	        eventSource = new EventSource(logurl);
	        eventSource.addEventListener("message", function(event) {
	            var response = event.data;
	            this.processResponse(response);
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
	        challengeUrl = getFullUrl("c#" + lang + "," + apikey + "," + curcode);
	    }
	    qrcode.makeCode(challengeUrl)
	}
	

	qrcodeBox.addEventListener("click",function() {	

	    var target = qrcodeBox.parentElement;
	    target.style.position="relative";
	    var iframe = document.createElement("IFRAME");
	    iframe.style.width="100%";
	    iframe.style.height="100%";
	    iframe.style.border="0";
	    iframe.style.position="absolute";
	    iframe.style.backgroundColor="white";
	    iframe.style.left="0";
	    iframe.style.top="0";
	    iframe.src=challengeUrl;
	    target.appendChild(iframe);
	    var xbutton = document.createElement("BUTTON");
	    xbutton.style.width="20px";
	    xbutton.style.height="20px";
	    xbutton.style.border="0";
	    xbutton.appendChild(document.createTextNode("X"));
	    xbutton.style.position="absolute";
	    xbutton.style.top="5px";
	    xbutton.style.right="5px";
	    target.appendChild(xbutton);
	    closeIFrameButt = function() {
	        iframe.parentElement.removeChild(iframe);
	        xbutton.parentElement.removeChild(xbutton);
	        closeIFrameButt = function () { };
	    };
	    xbutton.addEventListener("click", closeIFrameButt);
	});

    

	this.showDownloadBox = function() {

	    downloadBox.show();
	    downloadshown = true;
	    var timer = 61;

	    function decTimer() {
	        timer--;
	        if (!downloadshown) return;
	        if (timer == 0) {
	            this.reload(curmode);
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
	    window.open("print.html#" + lang + "," + apikey + "," + curcode);
	    this.reload(curmode);
	}

	function downloadKey() {
	    location.href = "backup?c="+curcode;
	    this.reload(curmode);
	}


	this.processResponse = function(response) {
	    var r = response.trim();
	    if (r == "") {
	        this.reload(curmode);
	        return;
	    }

	    var redir;
	    if (r.substr(0, 7) == "backup:") {

	        this.showDownloadBox();

	    } else {
	        redir = args.redirect_uri;
	        if (args.js) {
	            redir = redir + "#?";
	        } else {
	            var qmark = redir.indexOf('?');
	            if (qmark == -1) redir = redir + "?"; else redir = redir + '&';
	        }
	        var adjr = r + ":" + curcode;
	        redir = redir + "code=" + encodeURIComponent(adjr);
	        if (args.scope) redir = redir + "&scope=" + encodeURIComponent(args.scope);
	        if (args.state) redir = redir + "&state=" + encodeURIComponent(args.state);
	        window.top.location = redir;
	    }


	}

	this.setLang = function(l) {
	    lang = l;
	    if (!restpanel && !downloadshown) this.reload(curmode);
	    else if (restpanel) restoreBox.show();
	}

	this.setNewArgs = function(argss) {
	    args = argss;
	}

	this.restoreBackup = function() {
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




function LangPanel(panel,curlang, qrlogin) {
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
                qrlogin.setLang(l);
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

    window.qrlogin = new QRLogin(querystr, lang,
			{ qr: qrblock, restore: restoreBox, download: downloadBox });
    window.qrlogin.reload(false);

    window.langpanel = new LangPanel(panel, lang, qrlogin);
    window.selector = new Selector([
        getBlockById("tab_login"),
        getBlockById("tab_manage"),
        getBlockById("tab_restore")], [
            function () { window.qrlogin.reload(false); },
            function () { window.qrlogin.reload(true); },
            function () { qrlogin.restoreBackup();; }
        ]);
    window.selector.select(0);

}


var Selector = function (switches, actions) {



    this.select = function (v1) {
        for (var i = 0; i < switches.length; i++) {
            if (i == v1) switches[i].classList.add("hl");
            else switches[i].classList.remove("hl");
        }
    }
    for (var i = 0; i < switches.length; i++) {
        var fn = function (v) {
            this.select(v);
            actions[v]();
        }.bind(this, i);
        switches[i].addEventListener("click", fn);
    }

};


function start() {
    initObjects();	    
}

window.addEventListener("hashchange", function () {
    if (location.hash.substr(0, 2) == "#?") {
        var querystr = location.hash.substr(0, 2) == "#?" ? getQueryString(location.hash.substr(1)) : getQueryString(location.search);
        var lang = querystr["lang"];
        if (lang) {
            window.langpanel.setLang(lang);
            loadLang(lang);
        }
        window.qrlogin.setNewArgs(querystr);
        window.qrlogin.reload(false);
        window.selector.select(0);
    }
});