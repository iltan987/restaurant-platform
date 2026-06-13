-- CreateTable
CREATE TABLE "cust_passkey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "publicKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "createdAt" TIMESTAMP(3),
    "aaguid" TEXT,

    CONSTRAINT "cust_passkey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cust_passkey_userId_idx" ON "cust_passkey"("userId");

-- CreateIndex
CREATE INDEX "cust_passkey_credentialID_idx" ON "cust_passkey"("credentialID");

-- AddForeignKey
ALTER TABLE "cust_passkey" ADD CONSTRAINT "cust_passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "cust_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
