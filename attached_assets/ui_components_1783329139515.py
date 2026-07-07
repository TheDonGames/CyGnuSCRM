# ui_components.py (responsive + scrollbars + visible buttons, fixed messageboxes)
import tkinter as tk
from tkinter import ttk
import custom_messagebox as messagebox
from reportlab.lib.pagesizes import A4, A5
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from datetime import datetime
import os
import tempfile
import webbrowser
import utils

# =============================
# Base Preview
# =============================
class BasePreview(tk.Toplevel):
    def __init__(self, master, title, width=700, height=500, minsize=(400, 300)):
        super().__init__(master)

        # Tie window to main app (good on Windows taskbar + focus behavior)
        try:
            self.transient(master)
        except Exception:
            pass

        # Apply Cygnus icon (EXE-safe)
        utils.apply_window_icon(self)

        # Bring to front and focus (non-blocking; avoids "app stuck" feeling)
        try:
            self.lift()
            self.focus_force()
        except Exception:
            try:
                self.focus_set()
            except Exception:
                pass

        self.title(title)
        self.geometry(f"{width}x{height}")
        self.minsize(*minsize)
        self.configure(bg="#ffffff")
        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        # Optional: close on ESC
        try:
            self.bind("<Escape>", lambda e: self.destroy())
        except Exception:
            pass

        # Header
        tk.Label(self, text=title.upper(), font=("Segoe UI", 18, "bold"), bg="#ffffff").grid(
            row=0, column=0, sticky="ew", padx=12, pady=(12, 6)
        )

        # Scrollable text
        text_frame = tk.Frame(self, bg="#ffffff")
        text_frame.grid(row=1, column=0, sticky="nsew", padx=12)
        text_frame.columnconfigure(0, weight=1)
        text_frame.rowconfigure(0, weight=1)

        # The tk.Text widget has wrap="word" already, but we need to ensure long lines are forced.
        self.text = tk.Text(text_frame, wrap="word", font=("Consolas", 11), bg="#f8f8f8", relief="flat")
        self.text.grid(row=0, column=0, sticky="nsew")

        vsb = ttk.Scrollbar(text_frame, orient="vertical", command=self.text.yview)
        vsb.grid(row=0, column=1, sticky="ns")
        self.text.configure(yscrollcommand=vsb.set)

        # Buttons frame
        self.btn_frame = tk.Frame(self, bg="#ffffff")
        self.btn_frame.grid(row=2, column=0, sticky="ew", pady=(8, 12))
        for i in range(4):
            self.btn_frame.columnconfigure(i, weight=1)


# =============================
# Invoice Preview (Thermal)
# =============================

class InvoicePreview(BasePreview):
    """Thermal Invoice Preview Window"""

    def __init__(self, master, data):
        super().__init__(master, "Invoice Preview", width=900, height=600, minsize=(600, 480))
        self.data = data

        # ✅ Center preview text
        self.text.tag_configure("center", justify="center")

        self.insert_invoice_data()

        tk.Button(self.btn_frame, text="🖨 Print Invoice", command=self.print_invoice,
                  bg="#222", fg="white", width=20).grid(row=0, column=1, padx=8)
        tk.Button(self.btn_frame, text="✖ Close", command=self.destroy,
                  bg="#444", fg="white", width=15).grid(row=0, column=2, padx=8)

    def insert_invoice_data(self):
        d = self.data

        # ✅ No header here (header will be in PDF to avoid duplicates)
        content = f"""
Date: {datetime.now().strftime("%Y-%m-%d %H:%M")}
Invoice ID: {d.get('repair_id', '')}

Customer: {d.get('customer_name', '')}
Phone: {d.get('phone', '')}
Address: {d.get('address', '')}
Email: {d.get('email', '')}

MOF
{d.get('mof', '')}

DEVICE
Brand: {d.get('brand', '')}
Model: {d.get('model', '')}
Serial/IMEI: {d.get('serial', '')}

PROBLEM
{d.get('problem', '')}

Technician: {d.get('technician', '')}
Status: {d.get('status', '')}

TOTAL (USD): {d.get('price', '0.00')}

NOTES
{d.get('notes', '')}

Thank you for choosing Cygnus Repair!
"""

        self.text.delete("1.0", "end")
        self.text.insert("1.0", content.strip(), "center")
        self.text.yview_moveto(0.0)

    def print_invoice(self):
        d = self.data
        safe_id = str(d.get('repair_id', 'Unknown')).strip()
        path = os.path.join(tempfile.gettempdir(), f"Invoice_{safe_id}.pdf")

        try:
            # ✅ Thermal width (80mm). Change to 58 if needed
            mm_to_pt = 2.83464567
            paper_width = 80 * mm_to_pt

            body_font = "Helvetica"
            body_size = 8
            line_height = 11

            section_titles = {"mof", "device", "problem", "notes"}

            lines = self.text.get("1.0", "end").splitlines()
            while lines and lines[-1].strip() == "":
                lines.pop()

            header_height = 70  # body starts at height - 70

            # ✅ CORRECT HEIGHT SIMULATION (matches drawing exactly)
            def compute_body_height(lines_list):
                used = 0

                for line in lines_list:
                    text = line.strip()

                    if text == "":
                        used += 6
                        continue

                    # ✅ Section title block (REAL spacing used in drawing)
                    # y -= 4
                    # y -= 12
                    # draw title
                    # y -= 14
                    # => 30 total
                    if text.lower() in section_titles:
                        used += 30
                        continue

                    # ✅ TOTAL block (REAL spacing used in drawing)
                    # y -= 4
                    # divider
                    # y -= 14
                    # draw total
                    # y -= 16
                    # y -= 10
                    # => 44 total
                    if text.upper().startswith("TOTAL"):
                        used += 44
                        continue

                    # Normal line
                    used += line_height

                return used

            body_height = compute_body_height(lines)

            # ✅ IMPORTANT:
            # Height MUST be exactly header + body
            paper_height = header_height + body_height

            c = canvas.Canvas(path, pagesize=(paper_width, paper_height))
            width, height = paper_width, paper_height
            center_x = width / 2

            def draw_divider(y_pos):
                margin = 10
                c.setLineWidth(0.6)
                c.line(margin, y_pos, width - margin, y_pos)

            def draw_header():
                c.setFont("Helvetica-Bold", 11)
                c.drawCentredString(center_x, height - 18, "CYGNUS REPAIR CENTER")

                c.setFont("Helvetica-Bold", 9)
                c.drawCentredString(center_x, height - 32, "INVOICE")

                c.setFont("Helvetica", 8)
                c.drawCentredString(center_x, height - 45, "Professional Repair Services")

                draw_divider(height - 55)

            draw_header()

            # ✅ Start body
            y = height - 70
            c.setFont(body_font, body_size)

            for line in lines:
                text = line.strip()

                if text == "":
                    y -= 6
                    continue

                if text.lower() in section_titles:
                    y -= 4
                    draw_divider(y)
                    y -= 12
                    c.setFont("Helvetica-Bold", 9)
                    c.drawCentredString(center_x, y, text.upper())
                    c.setFont(body_font, body_size)
                    y -= 14
                    continue

                if text.upper().startswith("TOTAL"):
                    y -= 4
                    draw_divider(y)
                    y -= 14
                    c.setFont("Helvetica-Bold", 10)
                    c.drawCentredString(center_x, y, text)
                    c.setFont(body_font, body_size)
                    y -= 16
                    y -= 10
                    continue

                c.drawCentredString(center_x, y, text)
                y -= line_height

            # ✅ Draw final divider exactly at the current y (should become 0)
            draw_divider(y)

            c.save()

            try:
                webbrowser.open_new(path)
            except Exception:
                messagebox.showinfo("Saved", f"Invoice saved to: {path}", parent=self)

        except Exception as e:
            messagebox.showerror("Print Error", str(e), parent=self)

# =============================
# Receipt Preview
# =============================
class ReceiptPreview(BasePreview):
    """Thermal Receipt Preview Window"""

    def __init__(self, master, data):
        super().__init__(master, "Receipt Preview", width=780, height=560, minsize=(520, 420))
        self.data = data

        # ✅ Center preview content in Text widget
        self.text.tag_configure("center", justify="center")

        self.insert_receipt_data()

        tk.Button(self.btn_frame, text="🖨 Print Receipt", command=self.print_receipt,
                  bg="#222", fg="white", width=18).grid(row=0, column=1, padx=8)
        tk.Button(self.btn_frame, text="✖ Close", command=self.destroy,
                  bg="#444", fg="white", width=14).grid(row=0, column=2, padx=8)

    def insert_receipt_data(self):
        d = self.data

        # ✅ NOTE: Header removed from preview content to avoid duplication in PDF
        content = f"""
Date: {datetime.now().strftime("%Y-%m-%d %H:%M")}
Receipt ID: {d.get('repair_id', '')}

Customer: {d.get('customer_name', '')}
MOF#: {d.get('mof', '')}
Phone: {d.get('phone', '')}

Device
Brand: {d.get('brand', '')}
Model: {d.get('model', '')}
Serial/IMEI: {d.get('serial', '')}

Problem
{d.get('problem', '')}

Technician: {d.get('technician', '')}
Status: {d.get('status', '')}

Price (USD): {d.get('price', '0.00')}

Thank you for trusting Cygnus Repair!
"""

        self.text.delete("1.0", "end")
        self.text.insert("1.0", content.strip(), "center")
        self.text.yview_moveto(0.0)

    def print_receipt(self):
        d = self.data
        safe_id = str(d.get('repair_id', 'Unknown')).strip()
        path = os.path.join(tempfile.gettempdir(), f"Receipt_{safe_id}.pdf")

        try:
            # ✅ Thermal Paper Width (80mm)
            # Change 80 to 58 if needed
            mm_to_pt = 2.83464567
            paper_width = 80 * mm_to_pt

            # ✅ Font + spacing settings
            font_name = "Helvetica"
            font_size = 8
            line_height = 11

            # ✅ Receipt content lines (no header inside)
            lines = self.text.get("1.0", "end").splitlines()

            # ✅ Calculate dynamic height (content + padding + header)
            top_padding = 18
            bottom_padding = 18
            header_space = 55  # header + divider

            paper_height = (len(lines) * line_height) + top_padding + bottom_padding + header_space

            # ✅ Minimum height safety
            min_height = 180
            if paper_height < min_height:
                paper_height = min_height

            c = canvas.Canvas(path, pagesize=(paper_width, paper_height))
            width, height = paper_width, paper_height

            def draw_divider(y_pos):
                """Draw a clean thin divider line."""
                margin = 10
                c.setLineWidth(0.6)
                c.line(margin, y_pos, width - margin, y_pos)

            def draw_header():
                """Header printed ONCE (NO LOGO)."""
                c.setFont("Helvetica-Bold", 11)
                c.drawCentredString(width / 2, height - 18, "CYGNUS REPAIR CENTER")

                c.setFont("Helvetica-Bold", 9)
                c.drawCentredString(width / 2, height - 32, "REPAIR RECEIPT")

                draw_divider(height - 40)

            # ✅ Draw header once
            draw_header()

            # ✅ Draw receipt body
            c.setFont(font_name, font_size)

            y = height - 55
            center_x = width / 2

            for line in lines:
                text = line.strip()

                # ✅ section headings
                if text.lower() in ("device", "problem"):
                    y -= 6
                    draw_divider(y)
                    y -= 10
                    c.setFont("Helvetica-Bold", 9)
                    c.drawCentredString(center_x, y, text.upper())
                    c.setFont(font_name, font_size)
                    y -= 14
                    continue

                # ✅ spacing
                if text == "":
                    y -= 6
                    continue

                # ✅ centered line
                c.drawCentredString(center_x, y, text)
                y -= line_height

            # ✅ footer divider
            y -= 6
            draw_divider(y)

            c.save()

            try:
                webbrowser.open_new(path)
            except Exception:
                messagebox.showinfo("Saved", f"Receipt saved to: {path}", parent=self)

        except Exception as e:
            messagebox.showerror("Print Error", str(e), parent=self)

# =============================
# Label Preview
# =============================

class LabelPreview(BasePreview):
    """Small preview window for Repair ID Label before printing"""
    def __init__(self, master, data):
        super().__init__(master, "Label Preview - Repair ID", width=420, height=320, minsize=(320, 240))
        self.data = data
        self.insert_label_data()

        tk.Button(
            self.btn_frame,
            text="🖨 Print Label",
            command=self.print_label,
            bg="#222",
            fg="white",
            width=14
        ).grid(row=0, column=1, padx=6)

        tk.Button(
            self.btn_frame,
            text="🧾 Deposit Receipt",
            command=self.print_deposit_receipt,
            bg="#0066cc",
            fg="white",
            width=16
        ).grid(row=0, column=2, padx=6)

        tk.Button(
            self.btn_frame,
            text="✖ Close",
            command=self.destroy,
            bg="#444",
            fg="white",
            width=12
        ).grid(row=0, column=3, padx=6)

    def insert_label_data(self):
        d = self.data
        rep_id = d.get("repair_id") or d.get("rep_id") or ""

        content = f"""
REPAIR ID LABEL
------------------------------
Repair ID: {rep_id}
------------------------------
"""

        self.text.delete("1.0", "end")
        self.text.insert("1.0", content)
        self.text.yview_moveto(0.0)

    def print_label(self):
        d = self.data
        safe_id = str(d.get("repair_id") or d.get("rep_id") or "").strip()

        if not safe_id:
            messagebox.showerror(
                "Label Error",
                "Repair ID is empty. Please enter/select a record first.",
                parent=self
            )
            return

        label_path = os.path.join(tempfile.gettempdir(), f"Label_{safe_id}.pdf")

        try:
            # ✅ Exact label size: 80mm x 20mm
            label_w, label_h = 80 * mm, 20 * mm
            c = canvas.Canvas(label_path, pagesize=(label_w, label_h))

            # ✅ Repair ID at the top
            c.setFont("Helvetica-Bold", 8)
            c.drawCentredString(label_w / 2, label_h - 2.5 * mm, safe_id)

            # ✅ Vector barcode (scaled to fill width)
            from reportlab.graphics.barcode import code128

            barcode = code128.Code128(
                safe_id,
                barHeight=15 * mm,
                barWidth=0.50
            )

            target_w = 76 * mm
            scale_x = target_w / barcode.width

            x = (label_w - target_w) / 2
            y = 1.0 * mm

            c.saveState()
            c.translate(x, y)
            c.scale(scale_x, 1.0)
            barcode.drawOn(c, 0, 0)
            c.restoreState()

            c.showPage()
            c.save()

            try:
                webbrowser.open_new(label_path)
            except Exception:
                try:
                    os.startfile(label_path)
                except Exception:
                    messagebox.showinfo("Saved", f"Label saved to: {label_path}", parent=self)

        except Exception as e:
            messagebox.showerror("Label Error", str(e), parent=self)

    def print_deposit_receipt(self):
        """
        Thermal deposit receipt (80mm width) with AUTO-HEIGHT.
        - No MOF
        - Adds Condition
        - Fully centered text
        - Date In from software + live current time
        - Auto height (no extra bottom space)
        - "DEPOSIT RECEIPT" same size as "Repair ID"
        - NO LOGO
        """
        d = self.data

        repair_id = str(d.get("repair_id") or d.get("rep_id") or "").strip()
        if not repair_id:
            messagebox.showerror(
                "Receipt Error",
                "Repair ID is empty. Please enter/select a record first.",
                parent=self
            )
            return

        customer = str(d.get("customer_name", "")).strip()
        phone = str(d.get("phone", "")).strip()

        brand = str(d.get("brand", "")).strip()
        model = str(d.get("model", "")).strip()
        serial = str(d.get("serial", "")).strip()
        problem = str(d.get("problem", "")).strip()

        condition = str(
            d.get("condition") or d.get("device_condition") or d.get("laptop_condition") or ""
        ).strip()

        # ✅ Date In from software + live time
        date_in_raw = (
            d.get("date_in")
            or d.get("datein")
            or d.get("date_in_date")
            or d.get("date")
            or ""
        )

        if isinstance(date_in_raw, datetime):
            date_in_str = date_in_raw.strftime("%Y-%m-%d")
        else:
            date_in_str = str(date_in_raw).strip()

        if not date_in_str:
            date_in_str = datetime.now().strftime("%Y-%m-%d")

        live_time_str = datetime.now().strftime("%H:%M")
        date_in_display = f"{date_in_str} {live_time_str}"

        receipt_path = os.path.join(tempfile.gettempdir(), f"DepositReceipt_{repair_id}.pdf")

        # ==========================================================
        # ✅ WRAP FUNCTION
        # ==========================================================
        def wrap_text(text, max_chars=30):
            text = (text or "").strip()
            if not text:
                return []
            words = text.split()
            lines = []
            current = ""
            for word in words:
                if len(current) + len(word) + 1 <= max_chars:
                    current = (current + " " + word).strip()
                else:
                    lines.append(current)
                    current = word
            if current:
                lines.append(current)
            return lines

        # ==========================================================
        # ✅ BUILD ALL PRINT LINES FIRST
        # Each item = (text, font, size, gap_mm)
        # ==========================================================
        lines = []

        lines.append(("CYGNUS REPAIR CENTER", "Helvetica-Bold", 11, 5.5))
        lines.append(("DEPOSIT RECEIPT", "Helvetica-Bold", 10, 6))
        lines.append((f"Date In: {date_in_display}", "Helvetica", 9, 6))
        lines.append((f"Repair ID: {repair_id}", "Helvetica-Bold", 10, 7))

        lines.append(("-" * 30, "Helvetica", 9, 6))

        if customer:
            lines.append((f"Customer: {customer}", "Helvetica", 9, 6))
        if phone:
            lines.append((f"Phone: {phone}", "Helvetica", 9, 6))

        lines.append(("-" * 30, "Helvetica", 9, 6))

        device_line = "Device:"
        if brand or model:
            device_line = f"Device: {brand} {model}".strip()
        lines.append((device_line, "Helvetica", 9, 6))

        if serial:
            lines.append((f"Serial/IMEI: {serial}", "Helvetica", 9, 6))

        if condition:
            lines.append((f"Condition: {condition}", "Helvetica", 9, 6))

        if problem:
            lines.append(("-" * 30, "Helvetica", 9, 6))
            lines.append(("Problem:", "Helvetica-Bold", 9, 6))
            for pline in wrap_text(problem, max_chars=30):
                lines.append((pline, "Helvetica", 9, 5))

        lines.append(("-" * 30, "Helvetica", 9, 7))
        lines.append(("Status: RECEIVED", "Helvetica-Bold", 10, 7))
        lines.append(("Keep this receipt.", "Helvetica", 9, 6))
        lines.append(("Bring it when collecting", "Helvetica", 9, 6))
        lines.append(("your device after repair.", "Helvetica", 9, 6))

        # ==========================================================
        # ✅ CALCULATE AUTO HEIGHT (in mm)
        # ==========================================================
        top_margin_mm = 6
        bottom_margin_mm = 3

        text_block_mm = sum(item[3] for item in lines)
        total_h_mm = top_margin_mm + text_block_mm + bottom_margin_mm

        # ==========================================================
        # ✅ CREATE PDF WITH AUTO HEIGHT
        # ==========================================================
        try:
            w = 80 * mm
            h = total_h_mm * mm
            c = canvas.Canvas(receipt_path, pagesize=(w, h))

            y = h - (top_margin_mm * mm)

            # ✅ Draw all lines
            for txt, font, size, gap_mm in lines:
                c.setFont(font, size)
                c.drawCentredString(w / 2, y, txt)
                y -= gap_mm * mm

            c.showPage()
            c.save()

            try:
                webbrowser.open_new(receipt_path)
            except Exception:
                try:
                    os.startfile(receipt_path)
                except Exception:
                    messagebox.showinfo("Saved", f"Deposit receipt saved to: {receipt_path}", parent=self)

        except Exception as e:
            messagebox.showerror("Receipt Error", str(e), parent=self)
