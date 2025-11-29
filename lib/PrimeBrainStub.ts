
/**
 * @file PrimeBrainStub.ts
 * 
 * A simple publish-subscribe event bus for the PrimeBrain. This allows
 * decoupled communication between components, enabling features like the
 * TelemetryCollector and PrimeBotConsole to react to events happening
 * anywhere in the application.
 */

type EventCallback = (payload: any) => void;
type Subscribers = {
  [eventName: string]: EventCallback[];
};

class PrimeBrain {
  private subscribers: Subscribers = {};

  /**
   * Subscribes a component to a specific event.
   * @param eventName - The name of the event to listen for.
   * @param callback - The function to call when the event is fired.
   * @returns A function to unsubscribe.
   */
  subscribe(eventName: string, callback: EventCallback): () => void {
    if (!this.subscribers[eventName]) {
      this.subscribers[eventName] = [];
    }
    this.subscribers[eventName].push(callback);
    
    // Return an unsubscribe function
    return () => this.unsubscribe(eventName, callback);
  }

  /**
   * Unsubscribes a component from a specific event.
   * @param eventName - The name of the event.
   * @param callback - The specific callback function to remove.
   */
  unsubscribe(eventName: string, callback: EventCallback) {
    if (this.subscribers[eventName]) {
      this.subscribers[eventName] = this.subscribers[eventName].filter(
        (cb) => cb !== callback
      );
    }
  }

  /**
   * Sends an event to all subscribed components.
   * @param eventName - The name of the event to send.
   * @param payload - An object containing data relevant to the event.
   */
  sendEvent(eventName: string, payload: any) {
    // Log for debugging, preserving original functionality
    console.log(`[PrimeBrainStub] Event: ${eventName}`, payload);

    if (this.subscribers[eventName]) {
      this.subscribers[eventName].forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in subscriber for event ${eventName}:`, error);
        }
      });
    }
  }
}

// Singleton instance
export const PrimeBrainStub = new PrimeBrain();
