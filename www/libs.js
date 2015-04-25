var langtab = null;

function loadLang(lang, cb) {
	var connection = null;
	connection = new XMLHttpRequest();	
	connection.open("GET","lang/"+lang+".js",true);
	connection.onreadystatechange = function(request) {
        if (connection.readyState == 4 ) {
            if (connection.status == 200) {
                langtab = JSON.parse(connection.responseText);
                cb();
            } else {
				if (lang != "en") loadLang("en",cb);            	
            }
        }
	}
	connection.send();
}

function langSetText(element, index) {
	if (langtab[index]) {
		element.removeChild(element.firstChild);
		element.appendChild(document.createTextNode(langtab[index]));
	}
}

function langSetTextId(element, index) {
    if (!index) {
        index = element;
    }
    langSetText(document.getElementById(element), index);
}

function getQueryString(qs) {
    var a = qs.substr(1).split('&'); 
	if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
        var p=a[i].split('=', 2);
        if (p.length == 1)
            b[p[0]] = "";
        else
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
}