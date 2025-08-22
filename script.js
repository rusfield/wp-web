function loadPage(page) {
  fetch(`pages/${page}.html`)
    .then(res => {
      if (!res.ok) throw new Error("Ikke funnet");
      return res.text();
    })
    .then(html => {
      document.getElementById("content").innerHTML = html;
      history.pushState({}, "", `#${page}`);

      // Optional: if a function with the same name as the page exists, call it
      if (typeof window[page + 'Init'] === 'function') {
        window[page + 'Init']();
      }
    });
}

window.addEventListener("load", () => {
  const page = location.hash.substring(1) || "hjem";
  loadPage(page);
});


function kalenderInit() {
  // Load Google Visualization API (Charts) and then initialize the calendar
  google.charts.load('current', { packages: ['corechart'] });  // Load the charts package (includes Query)
  google.charts.setOnLoadCallback(function () {
    // Initialize FullCalendar after Google API is ready
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'timeGridWeek',
      slotMinTime: '06:00:00',
      slotMaxTime: '23:00:00',
      weekNumbers: true,
      weekText: "Uke",
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      },
      buttonText: {
        prev: "<",
        next: ">",
        prevYear: "<<",
        nextYear: ">>",
        today: "I dag",
        month: "Måned",
        week: "Uke",
        day: "Dag"
      },
      locale: 'nb',                             // Norwegian locale for text
      editable: false,                         // make events read-only (no drag/drop):contentReference[oaicite:9]{index=9}
      allDaySlot: false,                       // no "all-day" section, only timed events:contentReference[oaicite:10]{index=10}
      firstDay: 1,
      events: function (fetchInfo, successCallback, failureCallback) {
        // Prepare date range from fetchInfo
        var startDate = fetchInfo.start;  // beginning of calendar view range
        var endDate = fetchInfo.end;      // end of calendar view range (exclusive)
        // Format dates as YYYY-MM-DD for the query
        var startStr = startDate.toISOString().split('T')[0];
        var endStr = endDate.toISOString().split('T')[0];

        // Build Google Visualization API query to select columns and filter by date range
        var queryStr = "select A, B, C, D, E, F where (B >= date '" + startStr + "' and B < date '" + endStr + "') OR (F is not null or F != 'Ingen')";
        // A = Activity (title), B = Start DateTime, C = End DateTime, D = Status
        var query = new google.visualization.Query(
          "https://docs.google.com/spreadsheets/d/1xYVxOCG6cxmFlmLq5nWBZmJXKh0liPF3rFmE-i7Jxe0/gviz/tq?headers=1"
        );
        query.setQuery(queryStr);  // apply the SQL-like query to filter rows:contentReference[oaicite:11]{index=11}
        query.send(function (response) {
          if (response.isError()) {
            console.error("Error fetching data: " + response.getMessage());
            failureCallback(response.getMessage());
            return;
          }
          var dataTable = response.getDataTable();  // get results as a DataTable:contentReference[oaicite:12]{index=12}
          dataTable = sortDataTable(dataTable);

          // Build an array of event objects from the data
          var events = [];
          for (var i = 0; i < dataTable.getNumberOfRows(); i++) {
            var title = dataTable.getValue(i, 0);  // Col A: Activity
            var date = dataTable.getValue(i, 1);  // Col B: Date
            var start = dataTable.getValue(i, 2);  // Col C: Start Time
            var end = dataTable.getValue(i, 3);  // Col D: End Time
            var status = dataTable.getValue(i, 4);  // Col E: Status
            var type = dataTable.getValue(i, 5); // Col F: Type

            var startDateTime = populateDate(date, start);
            var endDateTime = populateDate(date, end);

            var event = {
              title: title,
              start: startDateTime,
              end: endDateTime
            };
            if (status === "Avlyst") {
              event.title = "Avlyst: " + event.title;
              event.color = "red";
            }
            // (If status is "Active", we leave the default color)
            events.push(event);



            if (type === "Gjenta Ukentlig") {
              var anchorDow = date.getDay();

              // find first occurrence (same weekday) on/after fetchInfo.start
              var first = new Date(fetchInfo.start);
              first.setHours(0, 0, 0, 0);
              var diff = (anchorDow - first.getDay() + 7) % 7;
              first.setDate(first.getDate() + diff);

              // loop weekly until fetchInfo.end (exclusive)
              for (var d = new Date(first); d < fetchInfo.end; d.setDate(d.getDate() + 7)) {
                // skip the original row date (we already pushed it)
                if (startOfDay(d).getTime() === startOfDay(date).getTime()) continue;

                var repStart = populateDate(d, start);
                var repEnd = populateDate(d, end);

                if (repStart <= date) continue;

                var repEvent = {
                  title: title,
                  start: repStart,
                  end: repEnd
                };

                if (!hasDuplicate(events, repEvent)) {
                  events.push(repEvent);
                }
              }
            }
          }

          // Provide the events to FullCalendar
          successCallback(events);  // tell FullCalendar to render these events:contentReference[oaicite:14]{index=14}
        });
      }
    });

    // Render the calendar
    calendar.render();
  });
}

function populateDate(date, timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);

  // Clone the date
  const result = new Date(date.getTime());


  // Set time
  result.setHours(hours);
  result.setMinutes(minutes);
  result.setSeconds(0);
  result.setMilliseconds(0);

  return result;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function normalizeTitle(t) {
  if (!t) return "";
  const idx = t.indexOf(":");
  if (idx >= 0) {
    return t.substring(idx + 1).trim();
  }
  return t.trim();
}

function hasDuplicate(evts, ev) {
  const s = new Date(ev.start).getTime();
  const e = new Date(ev.end).getTime();
  const normTitle = normalizeTitle(ev.title);

  for (let i = 0; i < evts.length; i++) {
    const otherTitle = normalizeTitle(evts[i].title);
    if (
      otherTitle === normTitle &&
      new Date(evts[i].start).getTime() === s &&
      new Date(evts[i].end).getTime() === e
    ) {
      return true;
    }
    else if(otherTitle === normTitle){
          console.log("Comparing " + normTitle + " to " + otherTitle);
          console.log(new Date(evts[i].start));
          console.log(new Date(ev.start));
    }
  }
  return false;
}

function sortDataTable(dataTable) {
  // Copy column definitions
  var sortedTable = new google.visualization.DataTable();
  for (var c = 0; c < dataTable.getNumberOfColumns(); c++) {
    sortedTable.addColumn(
      dataTable.getColumnType(c),
      dataTable.getColumnLabel(c)
    );
  }

  // Extract rows
  var rows = [];
  for (var r = 0; r < dataTable.getNumberOfRows(); r++) {
    var row = [];
    for (var c = 0; c < dataTable.getNumberOfColumns(); c++) {
      row.push(dataTable.getValue(r, c));
    }
    rows.push(row);
  }

  // Custom order for col F
  function orderKey(val) {
    if (val == null) return 1;          // null first
    if (val === "Ingen") return 2;      // "Ingen" second
    return 3;                           // everything else third
  }

  // Sort rows
  rows.sort(function (a, b) {
    var aKey = orderKey(a[5]);
    var bKey = orderKey(b[5]);
    if (aKey !== bKey) return aKey - bKey;

    // secondary sort: by date (col 1), then start time (col 2)
    var aDate = new Date(a[1]);
    var bDate = new Date(b[1]);
    if (aDate - bDate !== 0) return aDate - bDate;

    return String(a[2]).localeCompare(String(b[2])); // start time
  });

  // Add back into DataTable
  sortedTable.addRows(rows);
  return sortedTable;
}


function menuToggle() {
  var nav = document.getElementById("mainNav");
  nav.classList.toggle("show");

}

window.addEventListener("DOMContentLoaded", () => {
  const nav = document.getElementById("mainNav");
  const links = nav.querySelectorAll("a");

  links.forEach(link => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 1040) {
        nav.classList.remove("show");
      }
    });
  });
});