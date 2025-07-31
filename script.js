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
  console.log("Kalender initialized");

  // Load Google Visualization API (Charts) and then initialize the calendar
  google.charts.load('current', { packages: ['corechart'] });  // Load the charts package (includes Query)
  google.charts.setOnLoadCallback(function() {
    // Initialize FullCalendar after Google API is ready
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'timeGridWeek',
      slotMinTime: '06:00:00',
      slotMaxTime: '23:00:00',
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
      timeZone: 'Europe/Oslo',                  // display times in Oslo time zone
      editable: false,                         // make events read-only (no drag/drop):contentReference[oaicite:9]{index=9}
      allDaySlot: false,                       // no "all-day" section, only timed events:contentReference[oaicite:10]{index=10}

      events: function(fetchInfo, successCallback, failureCallback) {
        // Prepare date range from fetchInfo
        var startDate = fetchInfo.start;  // beginning of calendar view range
        var endDate = fetchInfo.end;      // end of calendar view range (exclusive)
        // Format dates as YYYY-MM-DD for the query
        var startStr = startDate.toISOString().split('T')[0];
        var endStr   = endDate.toISOString().split('T')[0];

        // Build Google Visualization API query to select columns and filter by date range
        var queryStr = "select A, B, C, D, E where B >= date '" + startStr + "' and B < date '" + endStr + "'";
        // A = Activity (title), B = Start DateTime, C = End DateTime, D = Status
        var query = new google.visualization.Query(
          "https://docs.google.com/spreadsheets/d/1xYVxOCG6cxmFlmLq5nWBZmJXKh0liPF3rFmE-i7Jxe0/gviz/tq?headers=1"
        );
        query.setQuery(queryStr);  // apply the SQL-like query to filter rows:contentReference[oaicite:11]{index=11}
        query.send(function(response) {
          if (response.isError()) {
            console.error("Error fetching data: " + response.getMessage());
            failureCallback(response.getMessage());
            return;
          }
          var dataTable = response.getDataTable();  // get results as a DataTable:contentReference[oaicite:12]{index=12}

          // Build an array of event objects from the data
          var events = [];
          for (var i = 0; i < dataTable.getNumberOfRows(); i++) {
            var title  = dataTable.getValue(i, 0);  // Col A: Activity
            var date   = dataTable.getValue(i, 1);  // Col B: Date
            var start  = dataTable.getValue(i, 2);  // Col C: Start Time
            var end    = dataTable.getValue(i, 3);  // Col D: End Time
            var status = dataTable.getValue(i, 4);  // Col E: Status

            var startDateTime = populateDate(date, start);
            var endDateTime = populateDate(date, end);

            console.log(start + " " + startDateTime);
            console.log(end + " " + endDateTime)

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
