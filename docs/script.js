document.addEventListener('DOMContentLoaded', () => {
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });

    const elementsToAnimate = document.querySelectorAll('.feature-item, .screenshot-gallery img, .tech-stack ul');
    elementsToAnimate.forEach(el => {
        observer.observe(el);
    });

    // Modal logic
    const modal = document.getElementById("myModal");
    const modalImg = document.getElementById("img01");
    const galleryImages = document.querySelectorAll(".screenshot-gallery img");
    const closeModal = document.querySelector(".close-modal");

    galleryImages.forEach(img => {
        img.onclick = function(){
            modal.style.display = "flex";
            modalImg.src = this.src;
        }
    });

    const close = () => {
        modal.style.display = "none";
    }

    closeModal.onclick = close;

    modal.onclick = function(event) {
        if (event.target === modal) {
            close();
        }
    }
});

// Add a simple animation style to the head
const style = document.createElement('style');
style.innerHTML = `
    .feature-item, .screenshot-gallery img, .tech-stack ul {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.6s ease-out, transform 0.6s ease-out;
    }

    .feature-item.visible, .screenshot-gallery img.visible, .tech-stack ul.visible {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(style);
