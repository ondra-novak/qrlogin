var langtab = null;

function loadLang(lang, cb) {
	var connection = null;
	connection = new XMLHttpRequest();	
	connection.open("GET","lang/"+lang+".js",true);
	connection.onreadystatechange = function(request) {
	    if (connection.readyState == 4) {
	        if (connection.status == 200) {
	            langtab = JSON.parse(connection.responseText);
	            for (var key in langtab) {
	                var clsname = "str_" + key;
	                var elm = document.getElementsByClassName(clsname);
	                for (var z = 0; z<elm.length; z++) {
	                    var e = elm[z];
	                    e.removeChild(e.firstChild);
	                    e.appendChild(document.createTextNode(langtab[key]));
	                }	                
	            }
	            if (cb) cb();
	        } else {
	            if (lang != "en") loadLang("en", cb);
	        }
	    }
	}
	connection.send();
}


function langGetText(index, defText) {
	if (langtab[index]) return langtab[index];
	else return defText;
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

function getBlockById(id) {
    var element = document.getElementById(id);
    element.show = function() {
        this.style.display = "block";
    }
    element.hide = function() {
        this.style.display = "none";
    }
    return element;

}