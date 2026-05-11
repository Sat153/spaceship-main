"use client";

import * as React from "react";
import { Plus, Filter, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarEvent } from "@/components/ui/calendar";
import { EventModal, EventModalData } from "@/components/ui/event-modal";
import { useAuth } from "@/lib/auth";
import {
  saveEvent,
  deleteEvent,
  type AdminEvent,
  type EventPayload
} from "@/app/actions/admin-calendar";
import { useAdminEvents, useAdminDepartments, useAdminUsers, useAdminClients, useContentPosts } from "@/hooks/useSWR";


export default function AdminCalendar() {
  const { user } = useAuth();

  // Use SWR hooks for cached data fetching
  const { events, isLoading: eventsLoading, refresh: refreshEvents } = useAdminEvents();
  const { departments } = useAdminDepartments();
  const { users } = useAdminUsers();
  const { clients } = useAdminClients();
  const { posts: contentPosts } = useContentPosts();

  const loading = eventsLoading;

  const [isEventModalOpen, setIsEventModalOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<AdminEvent | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterType, setFilterType] = React.useState<string>("all");
  const [isSubmitting, setIsSubmitting] = React.useState(false);


  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    const adminEvent = events.find(e => e.id === event.id);
    if (adminEvent) {
      setSelectedEvent(adminEvent);
      setSelectedDate(undefined);
      setIsEventModalOpen(true);
    }
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setSelectedDate(new Date());
    setIsEventModalOpen(true);
  };

  const convertToEventModalData = (event: AdminEvent): EventModalData => {
    let assignedTo: string[] = []
    if (event.assigned_to) {
      try { assignedTo = JSON.parse(event.assigned_to) } catch { assignedTo = [event.assigned_to] }
    }
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      start_date: new Date(event.start_date),
      end_date: new Date(event.end_date),
      all_day: event.all_day,
      location: event.location,
      meeting_url: event.meeting_url,
      assigned_to: assignedTo,
      department_id: event.department_id,
      client_id: event.client_id,
      priority: event.priority,
      color: event.color,
      tags: event.tags,
    }
  };

  const handleSaveEvent = React.useCallback(async (eventData: EventModalData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const payload: EventPayload = {
        title: eventData.title,
        description: eventData.description,
        event_type: eventData.event_type,
        start_date: eventData.start_date.toISOString(),
        end_date: eventData.end_date.toISOString(),
        all_day: eventData.all_day,
        location: eventData.location,
        meeting_url: eventData.meeting_url,
        assigned_to: eventData.assigned_to && eventData.assigned_to.length > 0
          ? JSON.stringify(eventData.assigned_to)
          : undefined,
        department_id: eventData.department_id,
        client_id: eventData.client_id,
        priority: eventData.priority,
        color: eventData.color,
        tags: eventData.tags,
        created_by: user.id,
      };

      const result = await saveEvent(payload, eventData.id);
      if (result.error) {
        console.error('Error saving event:', result.error);
        throw new Error(result.error);
      }

      await refreshEvents();
      setIsEventModalOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error in handleSaveEvent:', error);
    } finally {
      setIsSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, refreshEvents]);

  const handleDeleteEvent = React.useCallback(async (eventId: string) => {
    try {
      const result = await deleteEvent(eventId);
      if (result.error) {
        console.error('Error deleting event:', result.error);
        throw new Error(result.error);
      }

      await refreshEvents();
      setIsEventModalOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error in handleDeleteEvent:', error);
      throw error;
    }
  }, [refreshEvents]);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === "all" || event.event_type === filterType;
    return matchesSearch && matchesType;
  });

  const calendarEvents: CalendarEvent[] = filteredEvents.map(event => ({
    id: event.id,
    title: event.title,
    start_date: new Date(event.start_date),
    end_date: new Date(event.end_date),
    color: event.color,
    all_day: event.all_day,
  }));

  // Add scheduled content posts to calendar
  const scheduledPostEvents: CalendarEvent[] = contentPosts
    .filter((post: any) => post.is_scheduled && post.scheduled_for)
    .map((post: any) => ({
      id: `post-${post.id}`,
      title: `📝 ${post.title || 'Scheduled Post'}`,
      start_date: new Date(post.scheduled_for),
      end_date: new Date(post.scheduled_for),
      color: (post.status === 'approval' || post.status === 'posted') ? '#22c55e' : '#eab308',
      all_day: false,
    }));

  const allCalendarEvents = [...calendarEvents, ...scheduledPostEvents];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-black text-white">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Calendar</h1>
            <p className="text-gray-400">Manage events, meetings, and deadlines</p>
          </div>
          <Button
            onClick={handleCreateEvent}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="flex space-x-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-700 text-white"
              />
            </div>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48 bg-gray-900 border-gray-700 text-white">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="meeting">Meetings</SelectItem>
              <SelectItem value="deadline">Deadlines</SelectItem>
              <SelectItem value="reminder">Reminders</SelectItem>
              <SelectItem value="appointment">Appointments</SelectItem>
              <SelectItem value="block_time">Block Time</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Calendar */}
        <div className="bg-gray-900 rounded-lg border border-gray-700">
          <Calendar
            events={allCalendarEvents}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            selectedDate={selectedDate}
          />
        </div>

        {/* Event Modal */}
        <EventModal
          open={isEventModalOpen}
          onOpenChange={setIsEventModalOpen}
          event={selectedEvent ? convertToEventModalData(selectedEvent) : null}
          selectedDate={selectedDate}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          departments={departments}
          users={users}
          clients={clients}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}