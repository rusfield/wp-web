
var YOGO_CONVERT_TEXT_TAGS_TO_HTML = true;
var YOGO_PARSE_HTML_CONTINUOUSLY = true;
var YOGO_APP_SERVER = 'willepust.yogo.no';
!function () { var i = "https://" + YOGO_APP_SERVER + "/widgets/", l = new XMLHttpRequest; l.onloadend = function () { if (200 <= l.status && l.status < 300) { for (var e = JSON.parse(l.responseText), t = e.css, s = e.js, r = 0; r < t.length; r++) { var n = document.createElement("link"); n.rel = "stylesheet", n.setAttribute("type", "text/css"), n.href = i + t[r], document.head.appendChild(n) } for (var a = 0; a < s.length; a++) { var o = document.createElement("script"); o.setAttribute("type", "text/javascript"), o.src = i + s[a], document.head.appendChild(o) } } else console.error("YOGO: Failed to get widget file list from app server.") }, l.open("GET", i + "filelist.json?cachebuster=" + Date.now()), l.send() }();
