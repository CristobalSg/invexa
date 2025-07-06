-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
