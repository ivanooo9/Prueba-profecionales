"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Activity } from "lucide-react"
import { formatDate } from "@/lib/utils"

const pets = [
  {
    id: 1,
    name: "Max",
    breed: "Labrador",
    age: "3 años",
    owner: "Juan Pérez",
    collarId: "GPS-001",
    status: "active",
    lastVaccine: "2024-11-15",
    nextVaccine: "2025-01-15",
  },
  {
    id: 2,
    name: "Luna",
    breed: "Golden Retriever",
    age: "2 años",
    owner: "María García",
    collarId: "GPS-002",
    status: "active",
    lastVaccine: "2024-10-20",
    nextVaccine: "2025-01-18",
  },
  {
    id: 3,
    name: "Rocky",
    breed: "Pastor Alemán",
    age: "4 años",
    owner: "Carlos Rodríguez",
    collarId: "GPS-003",
    status: "inactive",
    lastVaccine: "2024-09-10",
    nextVaccine: "2025-01-22",
  },
]

export default function PetProfiles() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Perfiles de Mascotas</h2>
        <p className="text-muted-foreground">Mascotas registradas con collar GPS</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pets.map((pet) => (
          <Card key={pet.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{pet.name}</CardTitle>
                  <CardDescription>
                    {pet.breed} • {pet.age}
                  </CardDescription>
                </div>
                <Badge variant={pet.status === "active" ? "default" : "secondary"}>
                  {pet.status === "active" ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dueño:</span>
                  <span className="font-medium">{pet.owner}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID Collar:</span>
                  <span className="font-medium">{pet.collarId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Última vacuna:</span>
                  <span className="font-medium">{formatDate(pet.lastVaccine)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Próxima vacuna:</span>
                  <span className="font-medium text-primary">
                    {formatDate(pet.nextVaccine)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 gap-2">
                  <MapPin className="w-4 h-4" />
                  Ubicación
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-2 bg-transparent">
                  <Activity className="w-4 h-4" />
                  Historial
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
