import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "lucide-react"
import { formatDate } from "@/lib/utils"

const schedule = [
  { pet: "Max", vaccine: "Rabia", date: "2025-01-15", status: "pending" },
  { pet: "Luna", vaccine: "Parvovirus", date: "2025-01-18", status: "pending" },
  { pet: "Rocky", vaccine: "Moquillo", date: "2025-01-22", status: "pending" },
  { pet: "Bella", vaccine: "Rabia", date: "2025-01-25", status: "pending" },
  { pet: "Charlie", vaccine: "Parvovirus", date: "2025-02-01", status: "scheduled" },
]

export default function VaccinationSchedule() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Calendario de Vacunación
        </CardTitle>
        <CardDescription>Próximas vacunas programadas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {schedule.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="font-medium">{item.pet}</div>
                <div className="text-sm text-muted-foreground">{item.vaccine}</div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-sm font-medium">
                  {formatDate(item.date)}
                </div>
                <Badge variant={item.status === "pending" ? "default" : "secondary"} className="text-xs">
                  {item.status === "pending" ? "Pendiente" : "Programado"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
