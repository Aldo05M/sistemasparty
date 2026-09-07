// Animaciones y navegación propias de la página de contacto.
document.addEventListener('DOMContentLoaded', () => {
    const targets = document.querySelectorAll('[data-contact-reveal]');
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: .12 });
        targets.forEach(target => observer.observe(target));
    } else { targets.forEach(target => target.classList.add('is-visible')); }

    const toggle = document.querySelector('.mobile-menu-toggle');
    const menu = document.querySelector('.mobile-menu');
    const backdrop = document.querySelector('.contact-menu-backdrop');
    if (!toggle || !menu) return;
    const mobile = window.matchMedia('(max-width: 970px)');
    function setMenu(open) {
        menu.classList.toggle('open', open);
        menu.inert = !open;
        menu.setAttribute('aria-hidden', String(!open));
        document.body.classList.toggle('contact-menu-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    }
    setMenu(false);
    toggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
    backdrop?.addEventListener('click', () => setMenu(false));
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu.classList.contains('open')) {
            setMenu(false);
            toggle.focus();
        }
    });
    mobile.addEventListener('change', () => setMenu(false));
});
