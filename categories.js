/* =========================================================
   SLIDER DE CATEGORIES (page d'accueil)
   ========================================================= */

function initCategorySlider(slider) {

    const row = slider.closest(".category-row");
    const nav = row.querySelector(".category-row-nav");
    const prevBtn = nav.querySelector('[data-dir="-1"]');
    const nextBtn = nav.querySelector('[data-dir="1"]');


    function stepDistance() {

        const thumbs = slider.querySelectorAll(".category-thumb");

        if (thumbs.length < 2) {
            return slider.clientWidth;
        }

        return (
            thumbs[1].offsetLeft - thumbs[0].offsetLeft
        ) * 2;
    }


    function update() {

        const maxScroll =
            slider.scrollWidth - slider.clientWidth;


        if (maxScroll <= 1) {

            nav.hidden = true;

            return;
        }


        nav.hidden = false;

        prevBtn.disabled = slider.scrollLeft <= 1;
        nextBtn.disabled = slider.scrollLeft >= maxScroll - 1;
    }


    prevBtn.addEventListener("click", () => {

        slider.scrollBy({
            left: -stepDistance(),
            behavior: "smooth"
        });
    });


    nextBtn.addEventListener("click", () => {

        slider.scrollBy({
            left: stepDistance(),
            behavior: "smooth"
        });
    });


    slider.addEventListener("scroll", update);

    window.addEventListener("resize", update);


    update();
}


document
    .querySelectorAll("[data-category-slider]")
    .forEach(initCategorySlider);
