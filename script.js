function loadPage(page) {
    fetch(`pages/${page}.html`)
      .then(res => {
        if (!res.ok) throw new Error("Ikke funnet");
        return res.text();
      })
      .then(html => {
        document.getElementById("content").innerHTML = html;
        history.pushState({}, "", `#${page}`);
      })
      .catch(() => {
        document.getElementById("content").innerHTML = "<p>Fant ikke siden.</p>";
      });
  }
  
  window.addEventListener("load", () => {
    const page = location.hash.substring(1) || "hjem";
    loadPage(page);
  });
  