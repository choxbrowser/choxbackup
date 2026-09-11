const form = document.getElementById("searchForm");
const input = document.getElementById("searchInput");

if (form && input) {

    form.addEventListener("submit", function (event) {

        event.preventDefault();

        const query = input.value.trim();

        if (!query) {
            input.focus();
            return;
        }

        window.location.href =
            "results.html?q=" +
            encodeURIComponent(query);
    });
}


document
    .querySelectorAll("[data-search]")
    .forEach(function (button) {

        button.addEventListener("click", function () {

            const query =
                button.getAttribute("data-search");

            window.location.href =
                "results.html?q=" +
                encodeURIComponent(query);
        });

    });
