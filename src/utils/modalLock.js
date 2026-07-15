import { useEffect } from 'react';

// Ochiq modallar sonini sanaydi — bir vaqtda bir nechta modal bo'lsa ham,
// oxirgisi yopilgandagina 'modal-open' klassi olib tashlanadi.
let openCount = 0;

/**
 * Modal ochilganda <html> ga 'modal-open' klassini qo'shadi (yopilganda olib
 * tashlaydi). CSS bu klass orqali mobil pastki navbarni yashiradi, shunda modal
 * butun ekranni egallaydi va footer tugmalari to'liq ko'rinadi.
 * Modal komponentining yuqori qismida chaqiring: useModalOpen();
 */
export function useModalOpen() {
  useEffect(() => {
    openCount += 1;
    document.documentElement.classList.add('modal-open');
    return () => {
      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) document.documentElement.classList.remove('modal-open');
    };
  }, []);
}
