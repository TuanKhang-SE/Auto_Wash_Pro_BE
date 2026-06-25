import prisma from "../config/prisma.js";


const generateInvoiceNo = async () => {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD


  const lastInvoice = await prisma.invoices.findFirst({
    where: {
      InvoiceNo: { startsWith: `INV-${dateStr}-` }
    },
    orderBy: { InvoiceID: 'desc' }
  });

  let nextSequence = 1;
  if (lastInvoice) {
    const lastSequenceStr = lastInvoice.InvoiceNo.split('-')[2];
    nextSequence = parseInt(lastSequenceStr, 10) + 1;
  }

  const sequenceStr = nextSequence.toString().padStart(4, "0");
  return `INV-${dateStr}-${sequenceStr}`;
};


const fetchInvoiceFullData = async (transactionId) => {
  const transaction = await prisma.transactions.findUnique({
    where: { TransactionID: transactionId },
    include: {
      BookingGroups: {
        include: {
          branches: true,
          BookingItems: {
            include: {
              ServiceLineItems: {
                include: { Services: true }
              },
              Vehicles: true
            }
          },
          TransactionDiscounts: true
        }
      },
      Customers: {
        include: { Users: { select: { FullName: true, Phone: true } } }
      },
      PaymentRecords: {
        where: { Status: "Success" }
      },
      Invoices: true
    }
  });

  if (!transaction) throw new Error("Không tìm thấy giao dịch");

  return transaction;
};


const getInvoicePreview = async (transactionId) => {
  const transaction = await fetchInvoiceFullData(transactionId);
  return transaction;
};


const generateInvoice = async (transactionId) => {
  const transaction = await fetchInvoiceFullData(transactionId);

  if (transaction.Status !== "Paid") {
    throw new Error("Giao dịch chưa thanh toán, không thể xuất hóa đơn.");
  }

  if (transaction.Invoices && transaction.Invoices.length > 0) {
    const existing = transaction.Invoices.find(inv => inv.Status === "ISSUED");
    if (existing) {
      throw new Error(`Hóa đơn đã được xuất trước đó (Mã: ${existing.InvoiceNo})`);
    }
  }

  const invoiceNo = await generateInvoiceNo();

  const newInvoice = await prisma.invoices.create({
    data: {
      TransactionID: transactionId,
      InvoiceNo: invoiceNo,
      IssuedAt: new Date(),
      Status: "ISSUED"
    }
  });

  return newInvoice;
};


const getInvoiceById = async (invoiceId) => {
  const invoice = await prisma.invoices.findUnique({
    where: { InvoiceID: invoiceId }
  });

  if (!invoice) throw new Error("Không tìm thấy Hóa đơn");

  const fullData = await fetchInvoiceFullData(invoice.TransactionID);
  return { ...fullData, CurrentInvoice: invoice };
};


const cancelInvoice = async (invoiceId) => {
  return await prisma.invoices.update({
    where: { InvoiceID: invoiceId },
    data: { Status: "CANCELED" }
  });
};

export default {
  getInvoicePreview,
  generateInvoice,
  getInvoiceById,
  cancelInvoice,
  fetchInvoiceFullData
};
