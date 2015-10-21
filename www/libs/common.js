var langtab = null;

function loadLang(lang, cb) {

    httpGet("lang/" + lang + ".js", function(connection) {
        if (connection.status == 200) {
            langtab = JSON.parse(connection.responseText);
            for (var key in langtab) {
                var clsname = "str_" + key;
                var elm = document.getElementsByClassName(clsname);
                for (var z = 0; z < elm.length; z++) {
                    var e = elm[z];
                    e.removeChild(e.firstChild);
                    e.insertBefore(document.createTextNode(langtab[key]),e.firstChild);
                }
            }
            if (cb) cb();
        } else {
            if (lang != "en") loadLang("en", cb);
        }
    });
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
            b[p[0]] = decodeURIComponentPlus(p[1]);
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
    element.isVisible = function() {
        return this.style.display != "none";
    }
    return element;

}

var getFullUrl = function(x) {
    var challengeUrl = location.href.split('?')[0];
    challengeUrl = challengeUrl.substr(0, challengeUrl.lastIndexOf("/") + 1) + x;
    return challengeUrl;
}

function base64_encodeURIComponent(txt) {
	return txt.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '.').replace(/\n/g, '');
}

function base64_decodeURIComponent(txt) {
	return txt.replace(/-/g, '+').replace(/_/g, '/').replace(/\./g, '='); ;
}

function httpGet(url, cb) {
    var connection = new XMLHttpRequest();
    connection.open("GET", url, true);
    connection.onreadystatechange = function(request) {
        if (connection.readyState == 4) {
            var response = connection.responseText;
            cb(connection);
        }
    } .bind(this);
    connection.send();
}

function httpPost(url,data, cb) {
    var connection = new XMLHttpRequest();
    connection.open("POST", url, true);
    connection.onreadystatechange = function(request) {
        if (connection.readyState == 4) {
            var response = connection.responseText;
            cb(connection);
        }
    } .bind(this);
    connection.send(data);
}

function encodeURIComponentPlus(x) {
    var z = encodeURI(x);
    return z.replace(/=/g, "%3D").replace(/&/g, "%26").replace(/\+/g, "%2B").replace(/%20/g, "+")
                .replace(/:/g, "%3A").replace(/%0D%0A/g, "*").replace(/%0A/g, "*")
}
function decodeURIComponentPlus(x) {
    var z = x.replace(/\+/g, "%20").replace(/\*/g,"%0A");
    return decodeURIComponent(z);
}