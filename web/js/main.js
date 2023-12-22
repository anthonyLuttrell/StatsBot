const JSON_PATH = location.hostname === "localhost" || location.hostname === "127.0.0.1" ? "local_test/" : "/json/";
const JSON_QUERY = ".json?" + Date.now().toString();
const SUBS_STRING = "subreddits";
const SUBS_KEY = "subs";
const USERNAME_IDX = 0;
const TOTAL_COMMENTS_IDX = 1;
const TOTAL_SCORE_IDX = 2;
const TOTAL_NEG_COMMENTS_IDX = 3;
const WINDOW_RATIO = window.innerWidth / window.innerHeight;

window.onload = () => {
    setSelectBoxWidth();
    fetchSubreddits()
        .then(data => {
            fillSelectBox(data);
            saveUserData()
                .then(/* */);
        });
};

/**
 * After we fetch the list of subreddits, we use that response to populate the
 * HTML select element with the list of subreddits that the main app is looping
 * through. The user can select which subreddit they want to see results from.
 *
 * @param data
 */
function fillSelectBox(data) {
    const selectBox = document.getElementById("subreddits-select");
    for (let i = 1; i <= data.subs.length; i++) {
        let option = document.createElement("option");
        option.value = i.toString();
        option.text = data.subs[i - 1];
        selectBox.add(option);
    }
}

/**
 * Saves the user data for each JSON file to session storage. We loop through a
 * comma-separated list in session storage to get each sub's name, which
 * corresponds to a JSON file where the user data is saved. Because these files
 * are updated on the server every 6 hours, we need to avoid the browser cache
 * each time a user loads the web page. Appending "?<unique string>" to the end
 * of the URL will avoid the cache.
 *
 * @returns {Promise<void>}
 */
async function saveUserData() {
    const subsArr = sessionStorage.getItem(SUBS_KEY).split(",");
    for (const sub of subsArr) {
        const path = JSON_PATH + sub + JSON_QUERY;
        fetch(path)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                return Promise.reject()
            })
            .then(jsonResponse => {
                navigator.storage.estimate().then(estimate => {
                    const quotaPct = ((estimate.usage / estimate.quota) * 100).toFixed(2) + "%"
                    const quotaMB = (estimate.quota / 1024 / 1024).toFixed(2) + "MB"
                    console.log("Currently using about " +
                        quotaPct +
                        " of estimated storage quota (" +
                        quotaMB +
                        ").")
                });

                try {
                    sessionStorage.setItem(sub, JSON.stringify(jsonResponse));
                    sessionStorage.setItem(sub + "-timestamp", JSON.stringify(jsonResponse.timestamp));
                } catch (DOMException) {
                    console.warn("SessionStorage is full! " + DOMException);
                }
            })
            .catch(error => {
                console.error(error)
            });
    }
}

/**
 * We fetch a list of subreddits from the "subreddits.json" file saved to the
 * webserver, and we save it to one long comma-separated string in session
 * storage.
 *
 * @returns {Promise<any>}
 */
async function fetchSubreddits() {
    const path = JSON_PATH + SUBS_STRING + JSON_QUERY;
    const response = await fetch(path);
    const data = await response.json();
    sessionStorage.setItem(SUBS_KEY, data.subs.toString());
    return data;
}

/**
 * Displays a summary of each user's comment history.
 *
 * @param value
 */
function displayAllUsers(value) {
    if (value === "0") {   // value is 0 when user selects the default select box option, so don't do anything in that case
        return;
    }

    const searchBox = document.getElementById(("search-username-div"));
    const table = document.getElementById("output-table").getElementsByTagName("tbody")[0];
    const footerText = document.getElementById("footer-timestamp");
    const subsArr = sessionStorage.getItem(SUBS_KEY).split(",");
    const users = JSON.parse(sessionStorage.getItem(subsArr[value - 1]));
    const totalsArray = getTotalsArray(users);
    const box = document.getElementById('output-table-div');
    const selectBox = document.getElementById('subreddits-select');

    // when you select a different sub, the existing scroll event listener is removed
    // a new event listener is added further down. Doing this to reset the data the event listener uses
    selectBox.addEventListener('change', () => {
        box.removeEventListener('scroll', scrollEvent);
    })

    // takes the scroll bar to the top of the table when you select a different sub
    box.scrollTo(box.scrollTop, 0);
    // remove all rows when you select a different sub
    clearTable(table.rows.length);

    box.addEventListener('scroll', scrollEvent)

    // adds a scroll event listener which adds new rows when the scroll bar is close to the end
    function scrollEvent() {
        if ((box.scrollHeight - box.clientHeight - box.scrollTop) <= 10) {
            let visibleRows = document.getElementsByTagName('tbody')[0].rows.length;
            let newRows = visibleRows + 50;
            for (let i = visibleRows; i < newRows; i++) {
                createRows(table, totalsArray[i]);
                visibleRows++;
                if (visibleRows >= totalsArray.length) {
                    box.removeEventListener('scroll', scrollEvent);
                    break;
                }
            }
        }
    }

    document.body.className = 'waiting';
    //for (const user of totalsArray) {
    for (let i = 0; i < 50; i++) {
        // TODO this can all be refactored into smaller nested functions
        createRows(table, totalsArray[i]);
    }

    const utcTimestamp = JSON.parse(sessionStorage.getItem(subsArr[value - 1] + "-timestamp"));
    const localizedTimestamp = new Date(utcTimestamp);
    footerText.innerText = "Last updated: " + localizedTimestamp;
    searchBox.style.visibility = "visible";

    document.body.className = '';
}

// made this bit into a function so that it can be used in multiple places without needing to rewrite all of it
function createRows(table, user) {
    const newRow = table.insertRow(table.rows.length);

    const newCell0 = newRow.insertCell(USERNAME_IDX);
    const newCell1 = newRow.insertCell(TOTAL_COMMENTS_IDX);
    const newCell2 = newRow.insertCell(TOTAL_SCORE_IDX);
    const newCell3 = newRow.insertCell(TOTAL_NEG_COMMENTS_IDX);

    newCell0.style.width = "40%";
    newCell1.style.width = "20%";
    newCell2.style.width = "20%";
    newCell3.style.width = "20%";

    const userName = document.createTextNode(truncateUsername(user));
    const totalComments = document.createTextNode(user[TOTAL_COMMENTS_IDX]);
    const totalScore = document.createTextNode(user[TOTAL_SCORE_IDX]);
    const totalNegatives = document.createTextNode(user[TOTAL_NEG_COMMENTS_IDX]);

    newCell0.appendChild(userName)
    newCell1.appendChild(totalComments);
    newCell2.appendChild(totalScore);
    newCell3.appendChild(totalNegatives);
}

function truncateUsername(user) {
    let userNameString = user[0]

    if (WINDOW_RATIO < 0.70 && user[USERNAME_IDX].length > 11) {   // truncate the username because we are short on horizontal space
        userNameString = user[0].slice(0, 12);
        userNameString += "...";
    }
    else if (user[USERNAME_IDX].length > 25) {   // Reddit username character limit is 36
        userNameString = user[0].slice(0, 26);
        userNameString += "...";
    }

    return userNameString;
}

/**
 * Builds the totals array. Loop through the usersObj, adding up the total number of comments, the total score, and the total number of
 *     comments with a negative score.
 *
 *     For example: [["bob",31,278,0],["jane",12,773,2]]
 *
 * @param usersObj - A key-value pair object that contains the user ID, and each comment ID and comment score.
 * @returns {*[]} - For example: [["bob",31,278,0],["jane",12,773,2]]
 */
function getTotalsArray(usersObj) {
    const totalsArray = [];

    if (typeof usersObj !== "object") {
        console.warn("Incompatible datatype")
        return totalsArray;
    }

    for (const user in usersObj.users) {
        let totalUserComments = 0;
        let totalUserScore = 0;
        let totalNegativeComments = 0;

        for (const score of usersObj.users[user].commentScore) {
            totalUserComments++;
            totalUserScore += score;
            if (score < 0) {
                totalNegativeComments++;
            }
        }

        totalsArray.push([user, totalUserComments, totalUserScore, totalNegativeComments]);
    }

    return totalsArray;
}

function filterInput() {
    const input = document.getElementById("search-box");
    const filter = input.value.toUpperCase();
    const table = document.getElementById("output-table");
    const tr = table.getElementsByTagName("tr");

    for (let i = 0; i < tr.length; i++) {
        const td = tr[i].getElementsByTagName("td")[0];
        if (td) {
            let txtValue = td.textContent || td.innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            }
            else {
                tr[i].style.display = "none";
            }
        }
    }
}

function clearTable(tableLength) {
    const table = document.getElementById("output-table").getElementsByTagName("tbody")[0]
    for (let i = 0; i < tableLength; i++) {
        table.deleteRow(-1);
    }
}

function sortTableRowsByColumn(columnIndex, ascending) {
    const table = document.getElementById("output-table");
    const rows = Array.from(table.querySelectorAll(':scope > tbody > tr'));
    document.body.className = 'waiting';
    rows.sort((x, y) => {

        const xValue = x.cells[columnIndex].textContent;
        const yValue = y.cells[columnIndex].textContent;

        const xNum = parseFloat(xValue);
        const yNum = parseFloat(yValue);

        return ascending ? (xNum - yNum) : (yNum - xNum);
    });

    const fragment = new DocumentFragment();
    for (let row of rows) {
        fragment.appendChild(row);
    }

    table.tBodies[0].appendChild(fragment);
    document.body.className = '';
}

function setSelectBoxWidth() {
    const selectBox = document.getElementById("subreddits-select");
    if (WINDOW_RATIO > 1.25) {
        selectBox.style.width = "25%";
        selectBox.style.maxWidth = "25%";
    }
}

function validateRequest() {
    const userInput = document.getElementById("request-sub").value;
    const pattern = /^([a-z0-9][_a-z0-9]{2,20})$/gmi;
    if (pattern.test(userInput)) {
        // 1) validate the subreddit is active using XMLHttpRequest
        // 2) clear user input if it's valid, else prompt user that it's invalid
        // 3) add it to the list on the server, `poll/scanner_requests.csv` (a single string without quotes per line)
        //    a) we will have to use FTP to get/read the file contents first, then create a new file and write it to the same directory
        //    b) we should also check if the requested sub is already in the list and prompt the user if so
    }
    else {
        alert(
            "Invalid subreddit name entered!\n\n" +
            "Subreddit names can only contain letters, numbers, and underscores.\n\n" +
            "They must be at least 3 characters, and no more than 21 characters, " +
            "and must not begin with an underscore")
    }
}