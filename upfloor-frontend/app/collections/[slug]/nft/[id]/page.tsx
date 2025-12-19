"use client"

import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"

export default function NftDetail() {
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const router = useRouter()
  const [price, setPrice] = useState("0.22")

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <Button variant="outline" onClick={() => router.back()}>
        Back
      </Button>
      <Card className="citrus-border-gradient bg-card/50">
        <CardHeader>
          <CardTitle>
            {slug} • NFT #{id}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-64 rounded-lg bg-muted/30 flex items-center justify-center text-6xl">🌀</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Current Listing Price</div>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} className="font-mono" />
              <div className="text-xs text-muted-foreground">Enter a new price to update your listing.</div>
              <div className="flex items-center gap-2 mt-2">
                <Button className="citrus-button">Update Price</Button>
                <Button variant="outline">Cancel Listing</Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Bid Actions</div>
              <div className="flex items-center gap-2">
                <Button variant="outline">Place Bid</Button>
                <Button variant="outline">Withdraw Bid</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
