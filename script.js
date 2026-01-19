document.addEventListener('DOMContentLoaded', () => {

    /* =========================
       CHECKBOX LOGIC
    ========================== */

    const masterCheckbox = document.getElementById('master-checkbox');
    const rowCheckboxs = document.querySelectorAll('.row-checkbox');

    if (masterCheckbox) {
        masterCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            rowCheckboxs.forEach(cb => cb.checked = isChecked);
        });
    }

    rowCheckboxs.forEach(cb => {
        cb.addEventListener('change', () => {
            const allChecked = Array.from(rowCheckboxs).every(c => c.checked);
            const someChecked = Array.from(rowCheckboxs).some(c => c.checked);
            masterCheckbox.checked = allChecked;
            masterCheckbox.indeterminate = someChecked && !allChecked;
        });
    });

    /* =========================
       SORTING
    ========================== */

    let currentSortColumn = null;
    let currentSortDirection = 'asc';
    let isResizing = false;

    function sortTableByColumn(columnIndex) {
        if (isResizing) return;

        const tbody = document.getElementById('table-rows');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        const direction =
            currentSortColumn === columnIndex && currentSortDirection === 'asc'
                ? 'desc'
                : 'asc';

        rows.sort((rowA, rowB) => {
            const cellA = rowA.children[columnIndex].innerText.trim();
            const cellB = rowB.children[columnIndex].innerText.trim();

            const cleanNumber = (str) => {
                let cleaned = str.replace(/[^0-9.,-]+/g, "");
                let val = parseFloat(cleaned);

                if (str.includes('T')) val *= 1e12;
                if (str.includes('B')) val *= 1e9;
                if (str.includes('M')) val *= 1e6;

                return val;
            };

            const numA = cleanNumber(cellA);
            const numB = cleanNumber(cellB);

            if (!isNaN(numA) && !isNaN(numB)) {
                return direction === 'asc' ? numA - numB : numB - numA;
            }

            return direction === 'asc'
                ? cellA.localeCompare(cellB)
                : cellB.localeCompare(cellA);
        });

        rows.forEach(row => tbody.appendChild(row));

        currentSortColumn = columnIndex;
        currentSortDirection = direction;
        renderTablePage();
    }

    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            sortTableByColumn(th.cellIndex);
        });
    });

    /* =========================
       PAGINATION
    ========================== */

    const rowperpageSelect = document.getElementById('lines-per-page');
    const paginationWrapper = document.getElementById('pagination-wrapper');
    const totalCountLabel = document.getElementById('total-rows-count');

    let currentPage = 1;
    let rowsPerPage = parseInt(rowperpageSelect.value) || 10;

    function renderTablePage() {
        const rows = Array.from(document.querySelectorAll('#table-rows tr'));
        const totalRows = rows.length;
        const totalPage = Math.ceil(totalRows / rowsPerPage);

        if (currentPage > totalPage) currentPage = totalPage || 1;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;

        rows.forEach((row, index) => {
            row.style.display =
                index >= startIndex && index < endIndex ? '' : 'none';
        });

        if (totalCountLabel) totalCountLabel.innerText = totalRows;

        renderPaginationControls(totalPage);
    }

    function renderPaginationControls(totalPage) {
        paginationWrapper.innerHTML = '';

        const prevBtn = document.createElement('button');
        prevBtn.innerText = '<';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => {
            currentPage--;
            renderTablePage();
        };
        paginationWrapper.appendChild(prevBtn);

        for (let i = 1; i <= totalPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.innerText = i;
            if (i === currentPage) pageBtn.classList.add('active');

            pageBtn.onclick = () => {
                currentPage = i;
                renderTablePage();
            };

            paginationWrapper.appendChild(pageBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.innerText = '>';
        nextBtn.disabled = currentPage === totalPage;
        nextBtn.onclick = () => {
            currentPage++;
            renderTablePage();
        };
        paginationWrapper.appendChild(nextBtn);
    }

    rowperpageSelect.addEventListener('change', (e) => {
        rowsPerPage = parseInt(e.target.value);
        currentPage = 1;
        renderTablePage();
    });

    renderTablePage();

    /* =========================
       CSV EXPORT
    ========================== */

    const exportButton = document.getElementById('btn-export');

    function textify(cell) {
        return cell.innerText.replace(/\s+/g, ' ').trim();
    }

    function csvEscape(value) {
        const v = String(value).replace(/"/g, '""');
        return `"${v}"`;
    }

    function exportTableToCSV(tableSelector, { filename = 'market-watch.csv' } = {}) {
        const tbl = document.querySelector(tableSelector);
        if (!tbl) return;

        const headerCells = Array.from(tbl.tHead.rows[0].cells).slice(1);
        const header = headerCells.map(c => csvEscape(textify(c))).join(',');

        const allRows = Array.from(tbl.tBodies[0].rows);

        const selectedRows = allRows.filter(tr => {
            const cb = tr.querySelector('.row-checkbox');
            return cb && cb.checked;
        });

        const rowsToExport = selectedRows.length ? selectedRows : allRows;

        const rows = rowsToExport.map(tr => {
            const cells = Array.from(tr.cells).slice(1);
            return cells.map(td => csvEscape(textify(td))).join(',');
        });

        const csv = '\uFEFF' + [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    if (exportButton) {
        exportButton.addEventListener('click', () => {
            exportTableToCSV('#my-table');
        });
    }

    /* =========================
       COLUMN RESIZE
    ========================== */

    const resizablecols = document.querySelectorAll('th.resizable');

    resizablecols.forEach(th => {
        const resizer = document.createElement('div');

        Object.assign(resizer.style, {
            width: '4px',
            height: '100%',
            position: 'absolute',
            top: '0',
            right: '0',
            cursor: 'col-resize'
        });

        th.style.position = 'relative';
        th.appendChild(resizer);

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            const startX = e.pageX;
            const startWidth = th.offsetWidth;

            const onMouseMove = (e) => {
                th.style.width = (startWidth + (e.pageX - startX)) + 'px';
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                setTimeout(() => isResizing = false, 100);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });

});
