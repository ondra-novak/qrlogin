function QRLogin(args, lang, qrcodeBox) {
	
//	var qrcodeBox = document.getElementById("qrcode");
	var curcode = null;
	var challengeUrl = null;
	var useEventSource = false;
	var connection = null;
	var eventSource = null;
	var qrcode = new QRCode(qrcodeBox, {
		   useSVG : true,
	  });
	  
	  

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
	
	var apikey = getDomainFromUrl(args.redirect_uri)	
	
	this.reload = function(manage) {
		challengeUrl = location.href.split('?')[0]
		
		if (manage) {
			challengeUrl = challengeUrl.substr(0,challengeUrl.lastIndexOf("/")+1)+"e#"+lang+","+apikey;
		} else {
			var bytes = secureRandom(20);
			curcode = base64EncodeUrl(Crypto.util.bytesToBase64(bytes));
			var logurl = "l?c="+curcode
			
			if (window.EventSource) {
		        if (eventSource != null) eventSource.close();
				eventSource = new EventSource(logurl);
				eventSource.addEventListener("message",function(event) {
					var response = event.data;
					this.processResponse(response);
					eventSource.close();
				}.bind(this));
				eventSource.addEventListener("error",function(event) {
					if (eventSource.readyState == 2) {
						qrcodeBox.style.visibility = "hidden";
					}
				}.bind(this))
			} else {
			    if (connection != null) connection.abort();
				connection = new XMLHttpRequest();	
				connection.open("GET",logurl,true);
				connection.onreadystatechange = function(request) {
		            if (connection.readyState == 4 ) {
		                if (connection.status == 200) {
		                    var response = connection.responseText;
		                    this.processResponse(response);
		                } else if (connection.status == 409) {
		                	this.reload();
		                }
		            }
				}.bind(this);
				connection.send();
			}
				
			challengeUrl = challengeUrl.substr(0,challengeUrl.lastIndexOf("/")+1)+"c#"+lang+","+apikey+","+curcode;
		}
		qrcode.makeCode(challengeUrl)
		qrcodeBox.style.visibility = "visible";
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
		xbutton.addEventListener("click",function() {
			iframe.parentElement.removeChild(iframe);
			xbutton.parentElement.removeChild(xbutton);
		})
	})


	this.processResponse = function(response) {
		var r = response.trim();
		if (r == "") {
			this.reload();
			return;
		}
		
		var redir = args.redirect_uri;
		var qmark = redir.indexOf('?');
		if (qmark == -1) redir = redir + "?"; else redir = redir + '&';
		redir = redir + "code=" + encodeURIComponent(r);
		if (args.scope) redir = redir + "&scope=" + encodeURIComponent(args.scope);
		if (args.state) redir = redir + "&state=" + encodeURIComponent(args.state);
				
		window.top.location = redir;
	}
	
	this.setLang = function(l) {
	    lang = l;
	    this.reload();
	}
}



function updateLang() {
	langSetText(document.getElementById("str_login"),"login");
	langSetText(document.getElementById("str_manage"),"manage");
	langSetText(document.getElementById("clickinfo"),"clickinfo");
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
                loadLang(lang,updateLang);
            }.bind(this,langlist[i]);
            lpanel.appendChild(img);
            
        }
    }
    drawPanel();
}

function start() {
	
	var querystr = getQueryString(location.search);
	var lang = querystr["lang"];
	if (!lang) {
		lang = "en";
	}
	loadLang(lang,updateLang);
	
	var str_login = document.getElementById("str_login");
	var str_manage = document.getElementById("str_manage");
	var qrblock = document.getElementById("qrblock");
	var panel = document.getElementById("langpanel");
	
	var qrlogin = new QRLogin(querystr, lang, qrblock); 
	qrlogin.reload(false);
		
	str_login.classList.add("hl");
	str_login.addEventListener("click",function() {
		str_login.classList.add("hl");
		str_manage.classList.remove("hl");
		qrlogin.reload(false);
	});
	str_manage.addEventListener("click",function() {
		str_manage.classList.add("hl");
		str_login.classList.remove("hl");
		qrlogin.reload(true);
	});
	
	var langpanel = new LangPanel(panel,lang,qrlogin);
	
}
