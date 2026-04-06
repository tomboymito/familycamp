        // Данные для галереи
        const galleryData = [
            {
                title: "Территория",
                description: "Красивые виды и ухоженная территория",
                image: "https://images.unsplash.com/photo-1504851149312-7a075b496cc7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
            },
            {
                title: "Домики",
                description: "Комфортабельные места для проживания",
                image: "https://images.unsplash.com/photo-1571863533956-01c88e79957e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
            },
            {
                title: "Бани",
                description: "Современный банный комплекс",
                image: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
            },
            {
                title: "Природа",
                description: "Живописные окрестности",
                image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
            }
        ];

        // Переменные для карусели
        let currentSlide = 0;
        let slidesToShow = 3;

        // Инициализация при загрузке страницы
        document.addEventListener('DOMContentLoaded', function() {
            initializeApp();
        });

        function initializeApp() {
            // Инициализация галереи
            initGallery();
            
            // Инициализация карусели
            initCarousel();
            
            // Настройка обработчиков событий
            setupEventListeners();
            
            // Настройка плавной прокрутки
            setupSmoothScroll();
            
            // Активация текущего пункта меню
            activateCurrentMenuItem();
            
            // Адаптация карусели при изменении размера окна
            window.addEventListener('resize', updateCarouselView);
            
            // Обработчик скролла для верхней панели
            window.addEventListener('scroll', handleScroll);
            
            // Инициализация модальных окон
            initModals();
        }

        function handleScroll() {
            const topPanel = document.getElementById('topPanel');
            const heroSection = document.querySelector('.hero');
            const heroHeight = heroSection.offsetHeight;
            
            if (window.scrollY > heroHeight * 0.7) {
                topPanel.classList.add('scrolled');
            } else {
                topPanel.classList.remove('scrolled');
            }
            
            activateCurrentMenuItem();
        }

        function initModals() {
            // Обработчики для карточек
            document.querySelectorAll('.about-card').forEach(card => {
                card.addEventListener('click', function() {
                    const serviceType = this.getAttribute('data-service');
                    openServiceModal(serviceType);
                });
            });

            // Обработчики для кнопок закрытия
            document.querySelectorAll('.modal-close').forEach(closeBtn => {
                closeBtn.addEventListener('click', function() {
                    closeServiceModal();
                });
            });

            // Закрытие по клику на фон
            document.querySelectorAll('.service-modal').forEach(modal => {
                modal.addEventListener('click', function(e) {
                    if (e.target === this) {
                        closeServiceModal();
                    }
                });
            });

            // Закрытие по ESC
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    closeServiceModal();
                }
            });

            // Обработчики для кнопок бронирования в модальных окнах
            document.querySelectorAll('.modal-book-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const modal = this.closest('.service-modal');
                    const serviceName = modal.querySelector('.modal-title').textContent;
                    showBookingWithService(serviceName);
                });
            });
        }

        function openServiceModal(serviceType) {
            // Закрываем все модальные окна
            document.querySelectorAll('.service-modal').forEach(modal => {
                modal.classList.remove('active');
            });
            
            // Открываем нужное модальное окно
            const modal = document.getElementById(`modal-${serviceType}`);
            if (modal) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }

        function closeServiceModal() {
            document.querySelectorAll('.service-modal').forEach(modal => {
                modal.classList.remove('active');
            });
            document.body.style.overflow = '';
        }

        function initCarousel() {
            updateCarouselView();
            updateCarousel();
            createDots();
        }

        function updateCarouselView() {
            const width = window.innerWidth;
            if (width < 768) {
                slidesToShow = 1;
            } else if (width < 1200) {
                slidesToShow = 2;
            } else {
                slidesToShow = 3;
            }
            updateCarousel();
        }

        function updateCarousel() {
            const carousel = document.getElementById('servicesCarousel');
            const cards = document.querySelectorAll('.service-card');
            
            if (!carousel || cards.length === 0) return;
            
            const cardWidth = cards[0].offsetWidth + 24;
            const translateX = -currentSlide * cardWidth;
            
            carousel.style.transform = `translateX(${translateX}px)`;
            updateButtons();
            updateDots();
        }

        function updateButtons() {
            const cards = document.querySelectorAll('.service-card');
            const prevBtn = document.getElementById('carouselPrev');
            const nextBtn = document.getElementById('carouselNext');
            
            if (prevBtn) {
                prevBtn.disabled = currentSlide === 0;
                prevBtn.style.opacity = currentSlide === 0 ? '0.2' : '1';
            }
            
            if (nextBtn) {
                const maxSlide = cards.length - slidesToShow;
                nextBtn.disabled = currentSlide >= maxSlide;
                nextBtn.style.opacity = currentSlide >= maxSlide ? '0.2' : '1';
            }
        }

        function createDots() {
            const dotsContainer = document.getElementById('carouselDots');
            const cards = document.querySelectorAll('.service-card');
            
            if (!dotsContainer) return;
            
            dotsContainer.innerHTML = '';
            
            const dotsCount = Math.max(1, cards.length - slidesToShow + 1);
            
            for (let i = 0; i < dotsCount; i++) {
                const dot = document.createElement('button');
                dot.className = `carousel-dot ${i === 0 ? 'active' : ''}`;
                dot.addEventListener('click', () => {
                    currentSlide = i;
                    updateCarousel();
                });
                dotsContainer.appendChild(dot);
            }
        }

        function updateDots() {
            const dots = document.querySelectorAll('.carousel-dot');
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentSlide);
            });
        }

        function initGallery() {
            const galleryContainer = document.getElementById('galleryContainer');
            if (!galleryContainer) return;
            
            galleryData.forEach(item => {
                const galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item';
                galleryItem.innerHTML = `
                    <img src="${item.image}" alt="${item.title}" loading="lazy">
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                `;
                galleryContainer.appendChild(galleryItem);
            });
        }

        function setupEventListeners() {
            // Кнопки в герое
            const galleryBtn = document.getElementById('galleryBtn');
            const bookingBtn = document.getElementById('bookingBtn');
            
            if (galleryBtn) galleryBtn.addEventListener('click', showGallery);
            if (bookingBtn) bookingBtn.addEventListener('click', showBooking);
            
            // Кнопки карусели
            const carouselPrev = document.getElementById('carouselPrev');
            const carouselNext = document.getElementById('carouselNext');
            
            if (carouselPrev) {
                carouselPrev.addEventListener('click', () => {
                    if (currentSlide > 0) {
                        currentSlide--;
                        updateCarousel();
                    }
                });
            }
            
            if (carouselNext) {
                carouselNext.addEventListener('click', () => {
                    const cards = document.querySelectorAll('.service-card');
                    const maxSlide = cards.length - slidesToShow;
                    if (currentSlide < maxSlide) {
                        currentSlide++;
                        updateCarousel();
                    }
                });
            }
            
            // Кнопки бронирования в услугах
            document.querySelectorAll('.book-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const serviceCard = this.closest('.service-card');
                    const serviceName = serviceCard.querySelector('h3').textContent;
                    showBookingWithService(serviceName);
                });
            });
            
            // Кнопка отправки формы
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) submitBtn.addEventListener('click', sendMessage);
            
            // Кнопка добавления отзыва
            const addReviewBtn = document.getElementById('addReviewBtn');
            if (addReviewBtn) addReviewBtn.addEventListener('click', showAddReviewModal);
            
            // Обработчики для верхней панели
            document.querySelectorAll('.top-panel a').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        }

        function setupSmoothScroll() {
            document.querySelectorAll('.top-panel a').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        }

        function activateCurrentMenuItem() {
            const sections = document.querySelectorAll('section[id]');
            const topPanelLinks = document.querySelectorAll('.top-panel a');
            
            let current = '';
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                if (scrollY >= (sectionTop - 150)) {
                    current = section.getAttribute('id');
                }
            });
            
            topPanelLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        }

        function showGallery() {
            const gallerySection = document.getElementById('gallery');
            if (gallerySection) {
                gallerySection.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        }

        function showBooking() {
            const contactsSection = document.getElementById('contacts');
            if (contactsSection) {
                contactsSection.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => {
                    const checkInField = document.getElementById('checkIn');
                    if (checkInField) checkInField.focus();
                }, 500);
            }
        }

        function showBookingWithService(serviceName) {
            closeServiceModal();
            
            const contactsSection = document.getElementById('contacts');
            if (contactsSection) {
                contactsSection.scrollIntoView({
                    behavior: 'smooth'
                });
                
                setTimeout(() => {
                    const messageField = document.getElementById('message');
                    if (messageField) {
                        messageField.value = `Интересует услуга: ${serviceName}\n\n`;
                    }
                }, 500);
            }
        }

        async function sendMessage() {
            const submitBtn = document.getElementById('submitBtn');
            const payload = {
                check_in: document.getElementById('checkIn')?.value || '',
                check_out: document.getElementById('checkOut')?.value || '',
                spot_id: Number(document.getElementById('spotId')?.value || 0),
                guests_count: Number(document.getElementById('guestsCount')?.value || 0),
                customer_name: document.getElementById('name')?.value.trim() || '',
                customer_phone: document.getElementById('phone')?.value.trim() || '',
                customer_email: document.getElementById('email')?.value.trim() || '',
                comment: document.getElementById('message')?.value.trim() || '',
                website: document.getElementById('website')?.value || ''
            };

            if (!validateForm(payload)) {
                showNotification('Ошибка отправки формы: проверьте поля и даты.', 'error');
                return;
            }

            submitBtn.disabled = true;
            const initialText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="btn-icon"></span>Отправка...';

            try {
                const apiBaseUrl = window.API_BASE_URL || '';
                const availability = await fetch(`${apiBaseUrl}/availability?check_in=${payload.check_in}&check_out=${payload.check_out}&spot_id=${payload.spot_id}`);
                const availabilityData = await availability.json().catch(() => ({}));
                if (!availability.ok || availabilityData.available === false) {
                    showNotification('Выбранные даты заняты.', 'error');
                    return;
                }

                const response = await fetch(`${apiBaseUrl}/booking`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    showNotification('Бронь успешно отправлена.', 'success');
                    resetForm();
                    return;
                }

                if (response.status === 409) {
                    showNotification('Выбранные даты недоступны.', 'error');
                    return;
                }

                if (response.status === 429) {
                    showNotification('Слишком много запросов. Повторите позже.', 'error');
                    return;
                }

                showNotification('Ошибка отправки формы.', 'error');
            } catch (e) {
                showNotification('Временная техническая ошибка.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = initialText;
            }
        }

        function validateForm(payload) {
            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,32}$/;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const hasRequired = payload.customer_name.length >= 2
                && payload.spot_id > 0
                && payload.guests_count > 0
                && payload.check_in
                && payload.check_out;

            const validDateOrder = new Date(payload.check_out) > new Date(payload.check_in);
            return hasRequired && validDateOrder && phoneRegex.test(payload.customer_phone) && emailRegex.test(payload.customer_email);
        }

        function resetForm() {
            ['checkIn', 'checkOut', 'spotId', 'guestsCount', 'name', 'phone', 'email', 'message', 'website'].forEach((fieldId) => {
                const field = document.getElementById(fieldId);
                if (!field) return;
                if (field.tagName === 'SELECT') {
                    field.value = '';
                } else {
                    field.value = '';
                }
            });
        }

        function showAddReviewModal() {
            const name = prompt('Введите ваше имя:');
            if (!name) return;
            
            const review = prompt('Введите ваш отзыв:');
            if (!review) return;
            
            addNewReview(name, review);
        }

        function addNewReview(author, text) {
            const reviewsContainer = document.getElementById('reviewsContainer');
            if (reviewsContainer) {
                const newReview = document.createElement('div');
                newReview.className = 'review-card';
                newReview.innerHTML = `
                    <div class="review-stars">★★★★★</div>
                    <p>"${text}"</p>
                    <strong>- ${author}</strong>
                `;
                
                reviewsContainer.appendChild(newReview);
                showNotification('Спасибо за ваш отзыв!', 'success');
            }
        }

        function showNotification(message, type) {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }
    
