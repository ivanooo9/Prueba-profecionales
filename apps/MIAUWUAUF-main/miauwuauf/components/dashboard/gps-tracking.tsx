"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Activity } from "lucide-react"

const trackingData = [
  {
    id: 1,
    pet: "Max",
    location: "Parque Central",
    coordinates: "40.7128° N, 74.0060° W",
    lastUpdate: "2 min ago",
    status: "moving",
    battery: 85,
  },
  {
    id: 2,
    pet: "Luna",
    location: "Casa del dueño",
    coordinates: "40.7580° N, 73.9855° W",
    lastUpdate: "5 min ago",
    status: "stationary",
    battery: 92,
  },
  {
    id: 3,
    pet: "Rocky",
    location: "Veterinaria MIAUWUAUF",
    coordinates: "40.7489° N, 73.9680° W",
    lastUpdate: "1 min ago",
    status: "stationary",
    battery: 45,
  },
]

export default function GPSTracking() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Rastreo GPS en Tiempo Real
        </CardTitle>
        <CardDescription>Ubicación actual de mascotas con collar GPS</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trackingData.map((item) => (
            <div key={item.id} className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-lg">{item.pet}</div>
                  <div className="text-sm text-muted-foreground">{item.location}</div>
                  <div className="text-xs text-muted-foreground mt-1">{item.coordinates}</div>
                </div>
                <Badge variant={item.status === "moving" ? "default" : "secondary"}>
                  {item.status === "moving" ? "En movimiento" : "Estacionario"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Actualizado {item.lastUpdate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">Batería:</div>
                  <Badge variant={item.battery < 50 ? "destructive" : "outline"} className="text-xs">
                    {item.battery}%
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
