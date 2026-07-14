const Modals = {
    show(title, bodyHtml, onConfirm = null, confirmText = 'Save', confirmClass = 'btn-primary') {
        const container = document.getElementById('modal-container');
        
        let footerHtml = '';
        if (onConfirm) {
            footerHtml = `
                <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
                    <button class="btn btn-outline" onclick="Modals.close()">Cancel</button>
                    <button class="btn ${confirmClass}" id="modal-confirm-btn">${confirmText}</button>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="modal-overlay active" id="current-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="Modals.close()">&times;</button>
                    </div>
                    <div class="modal-body" id="modal-body-content">
                        ${bodyHtml}
                    </div>
                    ${footerHtml}
                </div>
            </div>
        `;

        if (onConfirm) {
            document.getElementById('modal-confirm-btn').addEventListener('click', async (e) => {
                const btn = e.target;
                const originalText = btn.innerHTML;
                btn.innerHTML = '<span class="loader" style="width: 14px; height: 14px; border-width: 2px;"></span>';
                btn.disabled = true;
                
                try {
                    await onConfirm();
                    Modals.close();
                } catch (err) {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    alert(err.message || 'Action failed');
                }
            });
        }
    },

    close() {
        const modal = document.getElementById('current-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                document.getElementById('modal-container').innerHTML = '';
            }, 200);
        }
    }
};
