<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony\EventSubscriber;

use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use ErrorExplorer\ErrorExplorer;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Messenger\Event\WorkerMessageFailedEvent;
use Symfony\Component\Messenger\Event\WorkerMessageHandledEvent;
use Symfony\Component\Messenger\Event\WorkerMessageReceivedEvent;

/**
 * Records Messenger message breadcrumbs and captures failures.
 */
final class MessengerSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            WorkerMessageReceivedEvent::class => 'onMessageReceived',
            WorkerMessageHandledEvent::class => 'onMessageHandled',
            WorkerMessageFailedEvent::class => 'onMessageFailed',
        ];
    }

    public function onMessageReceived(WorkerMessageReceivedEvent $event): void
    {
        $envelope = $event->getEnvelope();
        $message = $envelope->getMessage();

        BreadcrumbManager::add([
            'type' => 'message',
            'category' => 'messenger.received',
            'message' => sprintf('Received: %s', get_class($message)),
            'level' => 'info',
            'data' => [
                'message_class' => get_class($message),
                'transport' => $event->getReceiverName(),
            ],
        ]);
    }

    public function onMessageHandled(WorkerMessageHandledEvent $event): void
    {
        $envelope = $event->getEnvelope();
        $message = $envelope->getMessage();

        BreadcrumbManager::add([
            'type' => 'message',
            'category' => 'messenger.handled',
            'message' => sprintf('Handled: %s', get_class($message)),
            'level' => 'info',
            'data' => [
                'message_class' => get_class($message),
            ],
        ]);

        // Clear breadcrumbs after successful handling
        BreadcrumbManager::clear();
    }

    public function onMessageFailed(WorkerMessageFailedEvent $event): void
    {
        $envelope = $event->getEnvelope();
        $message = $envelope->getMessage();
        $exception = $event->getThrowable();

        BreadcrumbManager::add([
            'type' => 'message',
            'category' => 'messenger.failed',
            'message' => sprintf('Failed: %s', get_class($message)),
            'level' => 'error',
            'data' => [
                'message_class' => get_class($message),
                'will_retry' => $event->willRetry(),
            ],
        ]);

        // Tag as messenger context
        ErrorExplorer::setTags([
            'context' => 'messenger',
            'message_class' => get_class($message),
        ]);

        // Only capture if not retrying
        if (!$event->willRetry()) {
            ErrorExplorer::captureException($exception);
        }
    }
}
